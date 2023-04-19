# Discord bot idea
Facilitates uploading large files by splitting them and uploading the parts to Discord


## Method 1 - Standalone, static website
You want to upload a file  
Go to `split-files-into-8mb-chunks.com`  
Upload the file at the website  
Splits the file into 8mb chunks  
Select a folder on your computer  
It dumps all the parts into that folder in one fell swoop  
You upload the parts to Discord  

Someone wants do download your file  
They download all the parts  
They go to `split-files-into-8mb-chunks.com/merge`  
Upload the parts to the website  
Merges the parts back into the original file  
Dumps the file onto your hard drive  


## Method 2 - Discord bot + web interface
You want to upload a file  
Do `/upload`  
"Go to my website to split your file for Discord"  
Upload the file at the website  
Splits the file into 8mb chunks  
Sends the chunks to the server  
Bot hosted on server uploads the parts to its own Discord guild  
Writes down the links to the chunks in a database  
Sends a message: "[USER] uploaded [FILENAME]. Size: [SIZE]. [DOWNLOAD BUTTON]."

Someone wants to download your file  
They click Download  
It opens a website  
Website gets the links to all the parts that correspond to the requested file  
Downloads them on its own  
Merges the parts back into the original file  
Dumps the file onto your hard drive where you choose it to go



### /upload
Sends a private message with a link to `idksomewhere.com/upload?token=RANDOMTOKEN`  
Link contains a token to make sure people are only accessing this from the bot.  
Link is private only to the user calling the command to make sure no one can upload a file on another user's behalf.  
Tokens expire after some amount of time.  
A token is deleted when used.  
Tokens past expiration date are deleted during every call to `/upload`.  
File is uploaded and split.  
As they are made, each part is POSTed to `idksomewhere.com/upload` as a Multipart.  
FUTURE: Impose a filesize limit on the server. \<irony\>No terabyte files for you!\</irony\>  
Parts are uploaded to a private guild.  
Links to parts are recorded in a database:  
  Key: Message ID of the `/upload` command  
  Value: Comma-separated list of part URLs  
Sends a public message with a link to `idksomewhere.com/download/MESSAGEID/FILENAME` or `idksomewhere.com/file?=MESSAGEID#FILENAME`  
FILENAME is ignored; just looks nice.  


### /delete


## Routes
| Signature | Description |
| --------- | ----------- |
| `GET upload(token)` | the upload page; splits the file and calls `PATCH file()` on each part |
| `GET file(fileID)` | the download page; calls `parts()`, downloads them, merges them, downloads it to the user |
| `POST file(fileID, authorID)` | creates a new file entry; returns a token to upload files with |
| `PATCH file(token, filename, partData, partNumber, totalParts)` | called by `/upload` for each part | 
| `GET parts(fileID)` | returns file's parts' URLs |


## Interactions
The bot is going to need to tell the server to reserve uploads.
The server is going to need to tell the bot to upload files.


## Optimizations
Stream between client and server; chunking only necessary for uploading to Discord AND it's free if you're streaming.
- Actually, just upload the file like normal, no chunking, and the server can take it in as a stream with nothing extra.
- Streaming should reduce the number of requests for one upload from arbitrarily many to one.
Switch to better-sqlite3; better performance across the board.
Don't iterate over every byte of every chunk, but use math to decide how many bytes can be copied into the buffer and do it all at once.
Use BigInts instead of strings. Not sure whether it will work with the INTEGER type or if you will have to use BLOB.

---

## Potential future features
- Upload page
  - Start button
  - File size indicator
  - Cancel button

- Download page
  - Embed multimedia
    - Image viewer
    - Embed videos and audio
    - Download button


## Screens
- Upload
- Upload Going
  - Status indicator at the top
  - Loading bar at the bottom
  - When status indicator changes to "Done",
    - Loading bar goes away
    - An "aside" appears to tell you you can close the page now
- (Download doesn't need a start page; it starts downloading immediately)
- Downloading Going
  - Starts same as Upload Going
  - When status indicator changes to "Done",
    - Loading bar goes away
    - "If download didn't work" link appears
