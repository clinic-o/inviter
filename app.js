/// <reference path="ext.d.ts">
// @ts-ignore
import { render } from "https://unpkg.com/fill-me-in";
// Client ID and API key from the Developer Console
const CLIENT_ID = "838415726753-0mb9k5ru8klgk6vdo8noosa0n2nr2ttd.apps.googleusercontent.com";
const API_KEY = "AIzaSyC2IxyqE6zBXYDmqaauyhbzTQoGbfn7sQQ";
// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
    "https://sheets.googleapis.com/$discovery/rest?version=v4"
];
// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets"
].join(" ");
export async function main(authorizeButton, signoutButton, inviteForm, spreadsheetID, range) {
    appendPre("gapi.load: begin");
    inviteForm.addEventListener("submit", submitInvite);
    await new Promise((ok, fail) => gapi.load("client:auth2", {
        callback: ok,
        onerror: fail,
        timeout: 10 * 1000,
        ontimeout: fail
    }));
    appendPre("gapi.load: end");
    let updateSigninStatus = async function (isSignedIn) {
        authorizeButton.disabled = isSignedIn;
        signoutButton.disabled = !isSignedIn;
        if (!isSignedIn)
            return Promise.resolve();
        try {
            await listUpcomingEvents();
            await showSheet(spreadsheetID, range);
        }
        catch (err) {
            appendPre(JSON.stringify(err, Object.getOwnPropertyNames(err)));
            throw err;
        }
    };
    appendPre("gapi.client.init: begin");
    await gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    });
    appendPre("gapi.client.init: end");
    await updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
    authorizeButton.addEventListener("click", handleAuthClick);
    signoutButton.addEventListener("click", handleSignoutClick);
}
/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
    return gapi.auth2.getAuthInstance().signIn();
}
/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
    return gapi.auth2.getAuthInstance().signOut();
}
/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
    let pre = document.getElementById("debug");
    let textContent = document.createTextNode(`${message}\n`);
    pre?.appendChild(textContent);
}
async function showSheet(sid, range) {
    let params = (range == null ?
        { spreadsheetId: sid } :
        { spreadsheetId: sid, range: range });
    let response = await gapi.client.sheets.spreadsheets.values.get(params);
    let headers = response.result.values.slice(0, 1);
    await render("#records-header-template")
        .withValue(headers)
        .into("#records thead");
    return render("#records-template")
        .withValue(response.result.values.slice(2))
        .into("#records tbody");
}
/**
 * Print the summary and start datetime/date of the next ten events in
 * the authorized user's calendar. If no events are found an
 * appropriate message is printed.
 */
async function listUpcomingEvents() {
    let response = await gapi.client.calendar.events.list({
        "calendarId": "primary",
        "timeMin": (new Date()).toISOString(),
        "showDeleted": false,
        "singleEvents": true,
        "maxResults": 10,
        "orderBy": "startTime"
    });
    let events = response.result.items;
    appendPre("Upcoming events:");
    if (events.length < 1) {
        appendPre("No upcoming events found.");
        return;
    }
    for (let event of events) {
        let when = event.start.dateTime ?? event.start.date ?? "unknown";
        appendPre(`${event.summary} (${when})`);
    }
}
async function submitInvite(event) {
    let invite = event.target;
    let options = (new Intl.DateTimeFormat).resolvedOptions();
    let start = new Date(`${invite["date"].value}T${invite["start"].value}`);
    let end = new Date(`${invite["date"].value}T${invite["end"].value}`);
    start.setSeconds(0);
    start.setMilliseconds(0);
    end.setSeconds(0);
    end.setMilliseconds(0);
    return createEvent("Consultation", invite["notes"].value, invite["emails"].value.split(","), start.toISOString(), end.toISOString(), options.timeZone);
}
async function createEvent(summary, description, emails, startTime, endTime, tz) {
    let event = {
        summary: summary,
        description: description,
        start: {
            dateTime: startTime,
            timeZone: tz,
        },
        end: {
            dateTime: endTime,
            timeZone: tz,
        },
        attendees: emails.map(email => { return { email: email }; }),
    };
    let response = await gapi.client.calendar.events.insert({
        calendarId: "primary",
        resource: event
    });
    appendPre(`Event created: ${response.result.htmlLink}`);
}
