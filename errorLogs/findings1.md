Querying the chat.db database directly does not seem to yield certain messages, as they are not in the expected tables/rows
In my example I will use the text "i swear , chase and alyssa used to not be like that. all of them are brainwashed and stupid" sent on august 27 of 2023 at 8:55 PM from austinmarie11@icloud.com to me
This text shows up as [Empty Message] in the ChatViewer app, and cannot be found by standard queries in DB Browser for SQLite, however
performing a hex dump 
xxd chat.db | grep 'brainwashed'
yields the result:
03abd680: 2062 7261 696e 7761 7368 6564 2061 6e64   brainwashed and
Showing that the message does in fact exist in chat.db