let gapi = any;

type CalendarEvent = {
  start: { dateTime: string?, date: string? };
  summary: string;
}

function render(target: string | HTMLTemplateElement): Render<any>;
