You need a way to update pillars at the AIReceptionist client level so it propagates to all endpoints (text, email, calls, etc.). Let me add methods to the AIReceptionist client


Add a way to add the database to the AI, and there can be a flag to have like "AI created tables" or "integrate into my tables" which will be complex, should we even have an integrate into my 
tables option?


Check if we have prompt summarizer, for chat history that go beyond the set default (or user set) limits, check if the prompt summarizer uses the model the user provides,
Example: for 50 message history, summarize first 40, keep the 10 for pure context, provide the default numbers that are standard


Do we need "conversation store" doesn't agents have a memory system that handles all convo anyways? this seems redundant, we need to store stuff per channel, then an easy way to do it is to just mark the channel when the agent stores the operations it did 


When you register tools, it automatically gets added as a function call the AI can use right? 


We only need to load stuff like twilio api, sendgrid, etc whatever service we are needing, if its actually being used by the user,
aka the user set their credentials for it.


We need a way to test if the credentials are correct, to throw errors early for bad creds.


Write a markdown plan for this, read the code and tell me in the plan how to edit it to achieve my vision:
My vision is a path, like calls, will have access to multiple tools by default and users will be required to provide configs for them or explicitly turn them off from the default flow. Like for an example, calls will need access to google spreadsheets to write down the contents of the call, calendar to book people in, and any other numerous things people do during a call. Users will be able to *add in*, *other defaults that we already have implemented*, like if they want it to book into multiple calendars, like outlook or google (we default to google but have an interface to add outlook with just a simple config).
TLDR: Defined path that has all the user would need, they can add to the path or remove from it if they want, path throws an error if they
dont either some configs needed for the path
Path = Resource = Calls/Email/Sms 




