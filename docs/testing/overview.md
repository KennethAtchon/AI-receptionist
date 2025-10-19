This file is for manually testing.

What do we test first? - the default text resource

We test that:
Agents can be created by users with all the information put in.

Users can put in one overall description, and our sdk leverages a model (that users put the credentials for), uses this model to complete adding all the system prompt information, if users are lazy.
- Need to let users know about the auto populate feature, given only one prompt
- Let users know how to build the agents

We need to test how users can *register tools that we give them*, we will have some/ a lot already configured tools for them. All they have to do is call to register them.

They can also create their own custom tool and register it the same as other tools.

We need to fully build out atleast one of the default tools - the easiest and less resource extensive(cost), we need to learn how users to put in credentials for these tools. 