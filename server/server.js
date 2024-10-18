const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const server = app.listen(5000, ()=>{console.log('Server started on PORT 5000')});

function getLastLines(filePath, numLines = 10) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) return reject(err);

      const fileSize = stats.size;
      let buffer = Buffer.alloc(fileSize);
      let lines = [];
      let position = fileSize;
      let lineCount = 0;

      const readChunk = () => {
        const chunkSize = Math.min(16384, position); // Read in 16KB chunks
        position -= chunkSize;
        
        fs.read(fs.openSync(filePath, 'r'), buffer, fileSize - (position + chunkSize), chunkSize, position, (err, bytesRead) => {
          if (err) return reject(err);

          let content = buffer.toString('utf8', fileSize - (position + chunkSize), fileSize - position);
          let newLines = content.split(/\r?\n/);

          // Handle case where we're in the middle of a line
          if (lines.length > 0 && newLines[newLines.length - 1] !== '') {
            lines[0] = newLines.pop() + lines[0];
          }

          lines = [...newLines.reverse(), ...lines];
          lineCount += newLines.length;

          if (lineCount >= numLines || position === 0) {
            resolve(lines.reverse().slice(-numLines));
          } else {
            readChunk();
          }
        });
      };

      readChunk();
    });
  });
}

const logFilePath = path.join(__dirname, 'resource.txt');
let fileSize = fs.statSync(logFilePath).size;

const io = require('socket.io')(server, {
    pingTimeout: 60000,
    cors: {
      origin: 'http://localhost:3000',
    }
  });
  
  io.on('connection', (socket) => {
    console.log('A User Connected.');
  
    socket.join('fileRoom');
    console.log('A User Joined File Room');
    
    socket.on('disconnect', () => {
      console.log('A User Disconnected.');
    });
  });

let isProcessing = false;

fs.watch(logFilePath, (eventType) => {
    if (eventType === 'change' && !isProcessing) {
        isProcessing = true;

        // Get the new size of the file
        const newSize = fs.statSync(logFilePath).size;
        
        // If the file has grown, read the new content
        if (newSize > fileSize) {
            const newContentStream = fs.createReadStream(logFilePath, { start: fileSize });
            newContentStream.on('data', (chunk) => {
                console.log(`Chunk received, size: ${chunk.length}`);
                console.log(`Chunk received : ${chunk.toString()}`);
                
                io.to('fileRoom').emit('fileUpdate', chunk.toString());
            });

            newContentStream.on('end', () => {
                fileSize = newSize;
                isProcessing = false; // Ready for the next change
            });
        } else {
            isProcessing = false; // If file size hasn't grown, reset the flag
        }
    }
});

app.use(express.json());

app.get('/log', (req,res)=>{
    getLastLines(logFilePath, 10)
  .then(lastLines => res.json(lastLines))
  .catch(err => console.error('Error reading file:', err));
});
