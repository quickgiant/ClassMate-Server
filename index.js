var express       = require('express')
  , fs            = require('fs')
  , bodyParser    = require('body-parser')
  , randomstring  = require('randomstring')

var app = express()
app.use(bodyParser.json())

const THREADS_PATH = './threads.json'
const EVENTS_PATH = './events.json'

var threads, events
// Read threads from data file if present, or create one
if(fs.existsSync(THREADS_PATH)) {
    threads = JSON.parse(fs.readFileSync(THREADS_PATH, {encoding: 'utf8'}))
}
else {
    threads = []
    fs.writeFileSync(THREADS_PATH, JSON.stringify(threads), {encoding: 'utf8'})
}
// Read events from data file if present, or create one
if(fs.existsSync(EVENTS_PATH)) {
    events = JSON.parse(fs.readFileSync(EVENTS_PATH, {encoding: 'utf8'}))
}
else {
    events = []
    fs.writeFileSync(EVENTS_PATH, JSON.stringify(events), {encoding: 'utf8'})
}


// GET paths
app.get('/events', function(req, res) {
  res.send(events)
})
app.get('/events/:eventID', function(req, res) {
  var event = events.find(event => event.id === req.params.eventID)
  res.send(event)
})
app.get('/forum/categories', function(req, res) {
  var categories = threads.reduce(function(acc, currentThread) {
    if(!acc.includes(currentThread.category)) {
      acc.push(currentThread.category)
    }
  }, [])
  categories.sort()
  res.send(categories)
})
app.get('/forum/threads', function(req, res) {
  res.send(threads)
})
app.get('/forum/threads/:threadID', function(req, res) {
  var thread = threads.find(thread => thread.id === req.params.threadID)
  res.send(thread)
})

// POST paths
app.post('/events', postEvent)
app.post('/forum/threads', postThread)
app.post('/forum/threads/:threadID/comment', postComment)


/**
 * Generates a random, alphanumeric, lowercase ID with 6 characters
 * @returns {String} Generated random ID
 */
function generateID() {
  return randomstring.generate({
    length: 6,
    readable: true,
    charset: 'alphanumeric',
    capitalization: 'lowercase'
  })
}

/**
 * Posts a new event given a request and response, and writes data to disk.
 * Sends appropriate error response codes and logs to Node console if it fails.
 * 
 * @param {Request} req - Request object provided by Express route declaration function
 * @param {Response} res - Response object provided by Express route declaration function
 */
function postEvent(req, res) {
  if(!req.body.title ||
     !req.body.semanticLocation ||
     !req.body.latitude ||
     !req.body.longitude ||
     !req.body.usersAttending ||
     !req.body.startTime ||
     !req.body.endTime) {
    console.error('Failed to add event: Invalid data structure')
    res.status(400).end()
    return
  }

  const id = generateID()
  events.push({
    id: id,
    title: req.body.title,
    semanticLocation: req.body.semanticLocation,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    usersAttending: req.body.usersAttending,
    startTime: new Date(req.body.startTime),
    endTime: new Date(req.body.endTime),
  })
  fs.writeFile(EVENTS_PATH, JSON.stringify(events), function(err) {
    if(err) {
      console.error('Failed to add event: Error writing events file to disk')
      res.status(500).end()
      throw err
    }
    console.log('Added event "' + req.body.title + '" and saved events.json')
    res.status(200).end()
  })
}

/**
 * Posts a new thread given a request and response, and writes data to disk.
 * Sends appropriate error response codes and logs to Node console if it fails.
 * 
 * @param {Request} req - Request object provided by Express route declaration function
 * @param {Response} res - Response object provided by Express route declaration function
 */
function postThread(req, res) {
  if(!req.body.postText ||
     !req.body.author ||
     !req.body.category ||
     !req.body.comments
    ) {
    console.error('Failed to add thread: Invalid data structure')
    res.status(400).end()
    return
  }
  
  const id = generateID()
  events.push({
    id: id,
    postText: req.body.postText,
    timestamp: new Date(),
    author: req.body.author,
    category: req.body.category,
    comments: req.body.comments
  })

  fs.writeFile(THREADS_PATH, JSON.stringify(threads), function(err) {
    if(err) {
      console.error('Failed to add thread: Error writing threads file to disk')
      res.status(500).end()
      throw err
    }
    console.log('Added new thread and saved threads.json')
    res.status(200).end()
  })
}

/**
 * Posts a new comment given a request and response, and writes data to disk.
 * Sends appropriate error response codes and logs to Node console if it fails.
 * 
 * @param {Request} req - Request object provided by Express route declaration function
 * @param {Response} res - Response object provided by Express route declaration function
 */
function postComment(req, res) {
  if(!req.body.commentText ||
     !req.body.author
    ) {
    console.error('Failed to add thread: Invalid data structure')
    res.status(400).end()
    return
  }
    
  var parentThreadID = req.params.threadID
  var parentThread = threads.find(thread => thread.id === parentThreadID)
  if(!parentThread) {
    console.error('Failed to add comment: Could not locate parent thread')
    res.status(400).end()
    return
  }
  
  parentThread.comments.push({
    commentText: req.body.commentText,
    timestamp: new Date(),
    author: req.body.author
  })
  fs.writeFile(THREADS_PATH, JSON.stringify(threads), function(err) {
    if(err) {
      console.error('Failed to add comment: Error writing threads file to disk')
      res.status(500).end()
      throw err
    }
    console.log('Added new comment and saved threads.json')
    res.status(200).end()
  })
}

// Start listening for requests
app.listen(80, function() {
  console.log('ClassMate server listening on port 80')
})
