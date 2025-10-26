You need a way to update pillars at the AIReceptionist client level so it propagates to all endpoints (text, email, calls, etc.). Let me add methods to the AIReceptionist client - Done will test


----------


Write a markdown plan for this, read the code and tell me in the plan how to edit it to achieve my vision:
My vision is a path, like calls, will have access to multiple tools by default and users will be required to provide configs for them or explicitly turn them off from the default flow. Like for an example, calls will need access to google spreadsheets to write down the contents of the call, calendar to book people in, and any other numerous things people do during a call. Users will be able to *add in*, *other defaults that we already have implemented*, like if they want it to book into multiple calendars, like outlook or google (we default to google but have an interface to add outlook with just a simple config).
TLDR: Defined path that has all the user would need, they can add to the path or remove from it if they want, path throws an error if they
dont either some configs needed for the path
Path = Resource = Calls/Email/Sms 


My vision for the SDK is like things work like text resource. What text resource is right now, is the thing thats truly for devs, it sets up tools and devs can just plug it into a chat app and it does all the email sending, it takes calls on ur behalf, and sends sms messages and respond on ur behalf

This is what it will do just in the text resource. IT WILL LITERALLY DO THE SAME THINGS FOR THE OTHER RESOURCES BUT ITS JUST A DIFFERENT COMMUNICATION CHANNEL.

When the AI calls or you initiate call, it will keep the call going, while using tools to do all those other things.

Same for email

Same for sms

Thats my goal



Verify that all core resource, aside from text, are independent and only need to be called once, and thats like this is just an example the naming is bad: .setsession(phone), this will make the AI listen for calls and take calls, and lsiten for SMS and take sms from that number
For email basically the same thing
For text, its like the thats truly for dev, in a sense where they can manage it to my degree

