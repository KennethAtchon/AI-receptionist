You need a way to update pillars at the AIReceptionist client level so it propagates to all endpoints (text, email, calls, etc.). Let me add methods to the AIReceptionist client - Done will test


----------


Write a markdown plan for this, read the code and tell me in the plan how to edit it to achieve my vision:
My vision is a path, like calls, will have access to multiple tools by default and users will be required to provide configs for them or explicitly turn them off from the default flow. Like for an example, calls will need access to google spreadsheets to write down the contents of the call, calendar to book people in, and any other numerous things people do during a call. Users will be able to *add in*, *other defaults that we already have implemented*, like if they want it to book into multiple calendars, like outlook or google (we default to google but have an interface to add outlook with just a simple config).
TLDR: Defined path that has all the user would need, they can add to the path or remove from it if they want, path throws an error if they
dont either some configs needed for the path
Path = Resource = Calls/Email/Sms 




