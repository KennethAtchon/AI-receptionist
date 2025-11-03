Add better documents
Update all docs to follow modern patterns

Postmark Provider does alot of things for its consumers, should we change twilio provider to be like this? or add a TwilioHelper (idk naming) file in provider that can be like postmark provider (and do the same thing for postmark provider), this way we can make all the usage happen in one file, and one file is only a thinly wrapper for the actual api, is this design actually good?
Comment from me: Just keep it in the same file, move the twilio stuff to provider helper function.
