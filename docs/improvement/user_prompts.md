Simplfy the session metadata to just:
sessionMetadata: {
   conversationId?: string;
    callSid?: string;
    messageSid?: string;
    emailId?: string;
  inReplyTo?: string;          // REQUIRED for threading (this is enough!)
  from?: string;               // REQUIRED for participant matching
  to?: string;                // REQUIRED for participant matching
  subject?: string;            // REQUIRED for subject matching
  // Remove references entirely - can rebuild from conversation history
}

And remove goalAchieved field

Need a mandate that short term memory should only be used, if the information will 100% still be there in a 20 message window

Fix the problem with retrieve() 

