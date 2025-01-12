let MAIL_ID = "workplace-email-id";

let API_TOKEN = "jira-api-token";

let JIRA_PROJECT_NAME = "project-board-name";

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

let TESTING_SPACE_URL = "test-google-chat-webhook-url";
let OFFICAL_SPACE_URL = "google-chat-webhook-url";

let ARR = [TESTING_SPACE_URL, UNOFFICAL_SPACE_URL, OFFICAL_SPACE_URL];

// 0 for Testing, 1 for UnOfficial, 2 for Official Production
let TARGET = ARR[2];

let JIRA_PEOPLE = [
    {
        NAME: "Arun-1", // jiira display name
        ID: "123456789", // google chat-id
    },
    {
        NAME: "Arun-2",
        ID: "23456789",
    }
];

/**
 * Lists events for a specific day and checks if a particular event, 
 * "Stealth Internal Backlog," is present on the calendar for that day.
 * 
 * @param {boolean} yester - A flag to determine whether to check events for yesterday or today.
 *                            If `true`, checks yesterday's events; otherwise, checks today's events.
 * @returns {boolean} - Returns `true` if the event "Stealth Internal Backlog" is found; otherwise, returns `false`.
 */
function listEvents(yester) {
    let today = new Date();
    let dateToCheck = yester ? new Date(today.getTime() - MILLIS_PER_DAY) : new Date();

    let convertedDate = Utilities.formatDate(new Date(dateToCheck), "GMT+5:30", "dd/MM/yyyy");
    let whiteListDate = "";

    if (convertedDate === whiteListDate) {
        console.log('here')
        return true;
    }

    let cal = CalendarApp.getDefaultCalendar();
    let events = cal.getEventsForDay(dateToCheck);
    let sprintTuesday = false;

    if (events && events.length > 0) {
        for (i = 0; i < events.length; i++) {
            if (events[i].getTitle() === "Stealth Internal Backlog") {
                sprintTuesday = true;
                break
            }
        }
        Logger.log(sprintTuesday)
        return sprintTuesday;
    } else {
        return sprintTuesday;
    }
};

/**
 * Sets up time-based triggers for specific functions in the script. 
 * Each trigger executes a function at the specified time or schedule.
 * 
 * Steps:
 * 1. Deletes all previously set triggers to avoid duplication or conflicts.
 * 2. Creates new triggers for the following functions:
 *    - `morningReminder`: Executes daily at 9:15 PM.
 *    - `doComplain`: Executes daily at 10:15 AM.
 *    - `setTrigger`: Resets triggers daily at 2:15 AM.
 *    - `sprintClosureReminder`: Executes weekly on Tuesday at 5:30 PM and 7:15 PM.
 */
function setTrigger() {
    deleteAll();
    Logger.log("Deleted Prev Triggers");

    ScriptApp.newTrigger("morningReminder") // 9:15PM
        .timeBased()
        .atHour(21)
        .nearMinute(15)
        .everyDays(1)
        .create();
    Logger.log("morningReminder Done");

    ScriptApp.newTrigger("doComplain") // 10:15AM
        .timeBased()
        .atHour(10)
        .nearMinute(15)
        .everyDays(1)
        .create();
    Logger.log("doComplain Done");

    ScriptApp.newTrigger("setTrigger") // 2:15AM
        .timeBased()
        .atHour(2)
        .nearMinute(15)
        .everyDays(1)
        .create();
    Logger.log("setTrigger Done");

    ScriptApp.newTrigger("sprintClosureReminder") // 5:30PM
        .timeBased()
        .atHour(17)
        .nearMinute(30)
        .everyWeeks(1)
        .onWeekDay(ScriptApp.WeekDay.TUESDAY)
        .create()
    Logger.log("sprintClosureReminder Done 1");

    ScriptApp.newTrigger("sprintClosureReminder") // 7:15PM
        .timeBased()
        .atHour(19)
        .nearMinute(15)
        .everyWeeks(1)
        .onWeekDay(ScriptApp.WeekDay.TUESDAY)
        .create()
    Logger.log("sprintClosureReminder Done 2");
};

// Run this function once to Delete all Triggers.
function deleteAll() {
    let triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
        ScriptApp.deleteTrigger(triggers[i]);
    }
};

/**
 * Fetches the list of Jira ticket keys where work has been logged by a specific user during the current open sprint.
 * 
 * @param {string} display_name - The display name of the user whose worklog is being queried.
 * @returns {Array<string>} - An array of Jira ticket keys where the user has logged work, or an empty array in case of an error.
 * 
 * Function Workflow:
 * 1. Constructs a Jira Query Language (JQL) string to filter tickets for the given user in the current open sprint.
 * 2. Sets up HTTP request headers, including basic authentication using the user's credentials.
 * 3. Prepares the payload with the required fields for the Jira API request.
 * 4. Sends a POST request to the Jira API endpoint to fetch matching issues.
 * 5. Parses the API response to extract ticket keys and returns them as an array.
 * 6. Logs the list of ticket keys for debugging or tracking purposes.
 * 7. Handles and logs any errors encountered during the API request or response processing.
 */
function workloggedTickets(display_name) {
    let temp_string = `project = '${JIRA_PROJECT_NAME}' AND Sprint in openSprints() AND worklogAuthor = '${display_name}'`;
    headers = {
        "Authorization": `Basic ${Utilities.base64Encode(MAIL_ID + ":" + API_TOKEN)}`
    };

    const formData = {
        "expand": [
            "names",
            "schema",
            "operations"
        ],
        "jql": temp_string,
        "fields": [
            "key",
            "customfield_10007",
            "summary"
        ]
    };

    const options = {
        'method': 'post',
        'contentType': 'application/json',
        'headers': headers,
        'payload': JSON.stringify(formData),
        'muteHttpExceptions': true
    };

    let URL_STRING = "https://rently.atlassian.net/rest/api/3/search";

    try {
        // call the API
        let response = UrlFetchApp.fetch(URL_STRING, options);
        let data = response.getContentText();
        let json = JSON.parse(data);
        let arrayData = json['issues'];
        let issues = [];
        arrayData.forEach(el => issues.push(el.key));
        Logger.log(`${display_name}: ${issues}`);
        return issues;
    } catch (error) {
        Logger.log(error);
    };
};

// Function that converts the provided seconds into human readable time
function convertHM(value) {
    const sec = parseInt(value, 10);
    let hours = Math.floor(sec / 3600);
    let minutes = Math.floor((sec - (hours * 3600)) / 60);
    return `${hours}h ${minutes}m`;
};

/**
 * Calculates the total worklog time (in seconds) for a specified user on a specific day, either today or yesterday.
 * 
 * @param {string} display_name - The display name of the user whose worklog time is being calculated.
 * @param {boolean} yester - If true, calculates the worklog time for the previous day; otherwise, calculates for today.
 * @param {boolean} [friday=false] - If true and `yester` is also true, calculates the worklog time for the last working day (assumed to be Friday, three days prior).
 * @returns {number} - The total time logged by the user in seconds for the specified day.
 * 
 * Function Workflow:
 * 1. Fetches the list of Jira tickets where the user has logged work using the `workloggedTickets` function.
 * 2. For each ticket, retrieves the worklog data from Jira and filters it for entries made by the specified user.
 * 3. Checks the worklog entry date against the target date (today, yesterday, or last Friday).
 * 4. Sums up the time logged (in seconds) for all matching worklog entries.
 * 5. Logs and returns the total time.
 * 6. Handles and logs any errors encountered during the process.
 */
function workloggedTime(display_name, yester, friday = false) {
    headers = {
        "Authorization": `Basic ${Utilities.base64Encode(MAIL_ID + ":" + API_TOKEN)}`
    };

    const options = {
        'headers': headers,
        'muteHttpExceptions': true
    };

    try {
        // call the API
        let tickets = workloggedTickets(display_name);
        let timed = 0;

        tickets.forEach((issue) => {
            let URL_STRING = `https://rently.atlassian.net/rest/api/3/issue/${issue.toString()}/worklog`;
            let response = UrlFetchApp.fetch(URL_STRING, options);
            let data = response.getContentText();
            let json = JSON.parse(data);
            let arrayData = json['worklogs'];

            arrayData.forEach(function (worklog) {
                if (worklog.author.displayName === display_name) {
                    let workedFullDate = new Date(worklog.started);
                    let workedDate = Utilities.formatDate(workedFullDate, "IST", "yyyy-MM-dd");

                    let nowDate = new Date();
                    // let toCheckFullDate = yester ? new Date(nowDate.getTime() - MILLIS_PER_DAY) : new Date();
                    let toCheckFullDate = yester ? (friday ? new Date(nowDate.getTime() - 3 * MILLIS_PER_DAY) : new Date(nowDate.getTime() - MILLIS_PER_DAY)) : new Date();

                    let toCheckDate = Utilities.formatDate(toCheckFullDate, "IST", "yyyy-MM-dd")

                    if (workedDate === toCheckDate) {
                        timed = timed + worklog.timeSpentSeconds;
                    }
                }
            });
        });

        Logger.log(`${display_name}: ${timed}`);
        return timed;
    } catch (error) {
        Logger.log(error);
    };
};

/**
 * Sends a notification message via a webhook.
 * @param {string} message - The message to send.
 */
function sendNotification(message) {
    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ text: message }),
    };
    UrlFetchApp.fetch(TARGET, options);
}

/**
 * Generates a reminder for team members to log their time daily (9:15 PM reminder).
 */
function morningReminder() {
    const now = new Date();
    const now_day = now.getDay();
    const sprintDay = listEvents();

    if ([0, 6].includes(now_day) || (now_day === 2 && sprintDay) || (now_day === 3 && sprintDay)) return;

    let cry = false;
    let bot_text = "*Attention*\n";
    let congrats_text = "*Congratulations*\n";

    JIRA_PEOPLE.forEach(({ NAME, ID }) => {
        const loggedTime = workloggedTime(NAME);
        const moreLess = loggedTime > 28800 ? "more" : "less";

        if (loggedTime < 25200 || loggedTime > 32400) {
            cry = true;
            const loggedText = loggedTime === 0
                ? "*not logged time*!"
                : `${loggedTime < 28800 ? "only" : ""} logged *${convertHM(loggedTime)}*! Which is *${moreLess}* than expected. Please log your time correctly.`;

            bot_text += `\n<users/${ID}>, You have ${loggedText}\n`;
        }
    });

    if (cry) {
        bot_text += "```\nPlease Log Your Time Correctly!```";
        sendNotification(bot_text);
    } else {
        const final_text = now_day === 1
            ? "```\nStealth Team has logged time properly for FRIDAY!```"
            : "```\nStealth Team has logged time properly for YESTERDAY!```";
        sendNotification(congrats_text + final_text);
    }
}

/**
 * Generates a sprint closure reminder for team members to log time and close tickets.
 */
function sprintClosureReminder() {
    const now = new Date();
    const now_day = now.getDay();
    const sprintDay = listEvents();

    if (now_day !== 2 || !sprintDay) return;

    let cry = false;
    let bot_text = "*Attention*\n";

    JIRA_PEOPLE.forEach(({ NAME, ID }) => {
        const loggedTime = workloggedTime(NAME);
        const moreLess = loggedTime > 28800 ? "more" : "less";

        if (loggedTime < 25200 || loggedTime > 32400) {
            cry = true;
            const loggedText = loggedTime === 0
                ? "*STILL NOT logged time*! Please log your time correctly and *move tickets to done*, before the Sprint Closes!"
                : `STILL ${loggedTime < 28800 ? "ONLY" : ""} logged *${convertHM(loggedTime)}*! Which is *${moreLess}* than expected. Please log your time correctly!`;

            bot_text += `\n<users/${ID}>, You have ${loggedText}\n`;
        }
    });

    if (cry) {
        bot_text += "```\nPlease log your time correctly and Move Tickets to Done, before the Sprint Closes!```";
        sendNotification(bot_text);
    }
}

/**
 * Sends a morning reminder to log time for yesterday or Friday (if Monday).
 */
function doComplain() {
    const now = new Date();
    const now_day = now.getDay();
    const sprintDay = listEvents(true);

    if (now_day === 0 || ([2, 3].includes(now_day - 1) && sprintDay)) return;

    let cry = false;
    let bot_text = "*Attention*\n";
    let congrats_text = "*Congratulations*\n";

    JIRA_PEOPLE.forEach(({ NAME, ID }) => {
        const loggedTime = workloggedTime(NAME, true, now_day === 1);
        const moreLess = loggedTime > 28800 ? "more" : "less";

        if (loggedTime < 25200 || loggedTime > 32400) {
            cry = true;
            const loggedText = loggedTime === 0
                ? `*STILL not logged time* for ${now_day === 1 ? "FRIDAY" : "YESTERDAY"}!`
                : `STILL ${loggedTime < 28800 ? "ONLY" : ""} logged *${convertHM(loggedTime)}* for ${now_day === 1 ? "FRIDAY" : "YESTERDAY"}! Which is *${moreLess}* than expected.`;

            bot_text += `\n<users/${ID}>, You have ${loggedText}\n`;
        }
    });

    if (cry) {
        bot_text += now_day === 1
            ? "```\nYou have STILL not logged time properly for FRIDAY!```"
            : "```\nYou have STILL not logged time properly for YESTERDAY!```";
        sendNotification(bot_text);
    } else {
        const final_text = now_day === 1
            ? "```\nStealth Team has logged time properly for FRIDAY!```"
            : "```\nStealth Team has logged time properly for YESTERDAY!```";
        sendNotification(congrats_text + final_text);
    }
}
