/**
 * Example for creating and working with the Slack RTM API.
 */

/* eslint no-console:0 */

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var token = process.env.SLACK_API_TOKEN || 'xoxb-171447572308-vBpKWvbhghI5NTQq9kSWIQSz';

var rtm = new RtmClient(token, { logLevel: 'debug' });
rtm.start();


function PostMessage(message, channel) 
{
	rtm.sendMessage(message, channel);
}


function DisplayHelp(message) 
{
	var Output = "Help List: \n";
	
	Output += "/help - Help \n";
	Output += "hello - Greetings \n";
	Output += "/calc - calculate rest of text \n";
	Output += "/name - Get my name \n";
	Output += "/about - About me \n";
	Output += "/cat - Yes. \n";
	
	PostMessage(Output, message.channel);
}


function ProcessMessage(message) 
{
	if(message.text.includes("!h"))
	{
		message.text.replace("!h", "");
		DisplayHelp(message);
	}
	else if(message.text.includes("!hello"))
	{
		message.text.replace("!hello", "");
		PostMessage("Sup Homie", message.channel);
	}
	else if(message.text.includes("!calc"))
	{
		message.text.replace("!calc", "");
		PostMessage("WIP", message.channel);
	}
	else if(message.text.includes("!name"))
	{
		message.text.replace("!name", "");
		PostMessage("My name es JEFF", message.channel);
	}
	else if(message.text.includes("!about"))
	{
		message.text.replace("!about", "");
		PostMessage("This is the about me section", message.channel);
	}
	else if(message.text.includes("!cat"))
	{
		message.text.replace("!cat", "");
		PostMessage("https://static.pexels.com/photos/104827/cat-pet-animal-domestic-104827.jpeg", message.channel);
	}
}


rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  console.log('Message:', message);
  if(message.user != rtm.activeUserId )
  {
	ProcessMessage( message );
  }
});

rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
  console.log('Reaction added:', reaction);
});

rtm.on(RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
  console.log('Reaction removed:', reaction);
});
