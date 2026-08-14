const TORONTO_TIME = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getTorontoClock(date) {
  return Object.fromEntries(
    TORONTO_TIME.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

async function dispatchGitHubWorkflow(env) {
  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not configured.");
  }

  const workflow = encodeURIComponent(env.GITHUB_WORKFLOW);
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${workflow}/dispatches`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "toronto-swim-scheduler",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: "main" }),
  });

  if (response.status !== 204) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${detail}`);
  }
}

export default {
  async fetch() {
    return Response.json({
      service: "toronto-swim-scheduler",
      status: "ready",
      localSchedule: "03:15 America/Toronto",
      refreshDays: "Monday and Thursday",
      target: "nicklu94/toronto-swim-calendar",
    });
  },

  async scheduled(controller, env) {
    const scheduledDate = new Date(controller.scheduledTime);
    const torontoClock = getTorontoClock(scheduledDate);

    // Cloudflare cron is UTC-only. Two UTC triggers cover EST and EDT; exactly
    // one corresponds to 03:15 in Toronto on any given day.
    if (torontoClock.hour !== "03" || torontoClock.minute !== "15" || !["Mon", "Thu"].includes(torontoClock.weekday)) {
      console.log(JSON.stringify({
        outcome: "skipped",
        reason: "not-monday-or-thursday-03:15-in-toronto",
        scheduledTime: scheduledDate.toISOString(),
        torontoClock,
      }));
      return;
    }

    await dispatchGitHubWorkflow(env);
    console.log(JSON.stringify({
      outcome: "dispatched",
      scheduledTime: scheduledDate.toISOString(),
      torontoClock,
    }));
  },
};
