# slackbot


#start the client

ensure node is installed. Go to the webpage and install it for your system

to run, open cmd, navigate to the project directory, and run


```
node client.js
```


in the near future we will be making the bot token hidden, and therefore will probably be running something along the lines of

```
SLACK_API_TOKEN=xoxp-abc-123 node client.js
```

where the token is only given at runtime by the executable and is not stored in the codebase. However everything has a starting point.

# Posting with the bot


Starting a bot up requires a bot token (bot tokens start with `xoxb-`),
which can be had either creating a [custom bot](https://my.slack.com/apps/A0F7YS25R-bots) or by creating an app with a
bot user, at the end of the [OAuth dance](https://api.slack.com/docs/oauth). If you aren't sure path is right for you,
have a look at the [Bot Users documentation](https://api.slack.com/bot-users).

```js
var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var bot_token = process.env.SLACK_BOT_TOKEN || '';

var rtm = new RtmClient(bot_token);

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

// you need to wait for the client to fully connect before you can send messages
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
  rtm.sendMessage("Hello!", channel);
});

rtm.start();
```