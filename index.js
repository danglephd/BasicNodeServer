const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors')
require('dotenv').config()
const app = express();
const { realtimeDb } = require('./config/firebase-config');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'iisnode');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    fs.appendFileSync(path.join(logDir, 'app-error.log'), `${new Date().toISOString()} - ${err.stack}\n`);
    res.status(500).send('Something broke!');
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;
const db_host = process.env.database_HOST || './database/gitlab_issue.db';
const default_node = 'issues';

// Serve static files first
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript; charset=UTF-8');
    }
    if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css; charset=UTF-8');
    }
    // Add cache control
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// API Routes
const apiRouter = express.Router();
app.use('/api', apiRouter);

const db_sqlite = new sqlite3.Database(db_host, (err) => {
  if (err) {
    console.error(err.message);
    console.error(db_host);
    return
  }
  console.log(`Connected to ${db_host}.`);
});

// Thêm middleware để set Content-Type cho các file JavaScript module
app.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

function sortByTime(a, b) {
  if(a.duedate === " " || a.duedate === ""){
    return 1;
  }
  
  if(b.duedate === " " || b.duedate === ""){
    return -1;
  }

  let valueA = Date.parse(a.duedate);
  let valueB = Date.parse(b.duedate);
  return (valueA < valueB) ? -1 : (valueA > valueB) ? 1 : 0;
}

// Welcome
app.get('/', (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(`Hello, World!\n
  ${db_host}
  `);
});

// GET all issues
apiRouter.get('/issues', async (req, res) => {
  try {
    const node = default_node;
    
    // Lấy dữ liệu từ Realtime Database
    const snapshot = await realtimeDb.ref(node).once('value');
    const allIssues = snapshot.val();
    
    // Chuyển đổi dữ liệu thành mảng và thêm id
    const issues = [];
    if (allIssues) {
      Object.keys(allIssues).forEach(key => {
        issues.push({ id: key, ...allIssues[key] });
      });
    }
    
    // Sắp xếp theo thời gian
    res.send(issues.sort(sortByTime));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// GET issues by issue number
apiRouter.get('/issues/:issue', async (req, res) => {
  try {
    const { issue } = req.params;
    const node = default_node;
    
    // Lấy dữ liệu từ Realtime Database
    const snapshot = await realtimeDb.ref(node).once('value');
    const allIssues = snapshot.val();
    
    // Tìm tất cả issues có cùng issue_number
    const foundIssues = [];
    if (allIssues) {
      // Duyệt qua tất cả các issues để tìm các issues có issue_number tương ứng
      Object.keys(allIssues).forEach(key => {
        if (allIssues[key].issue_number === issue) {
          foundIssues.push({ id: key, ...allIssues[key] });
        }
      });
    }
    
    if (foundIssues.length === 0) {
      res.status(404).send('No issues found with this issue number');
    } else {
      res.send(foundIssues);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// GET issues by status
apiRouter.post('/issues/status', async (req, res) => {
  try {
    const { status: issue_state } = req.body;
    const node = default_node;
    
    // Lấy dữ liệu từ Realtime Database
    const snapshot = await realtimeDb.ref(node).once('value');
    const allIssues = snapshot.val();
    
    // Tìm tất cả issues có cùng status
    const foundIssues = [];
    if (allIssues) {
      // Duyệt qua tất cả các issues để tìm các issues có status tương ứng
      Object.keys(allIssues).forEach(key => {
        if (allIssues[key].test_state === issue_state) {
          foundIssues.push({ id: key, ...allIssues[key] });
        }
      });
    }
    
    if (foundIssues.length === 0) {
      res.status(404).send('No issues found with this status');
    } else {
      res.send(foundIssues.sort(sortByTime));
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// GET issues by status and number
apiRouter.post('/issues/search', async (req, res) => {
  try {
    const {
      issue_number,
      status: issue_state
    } = req.body;
    
    const node = default_node;
    
    // Lấy dữ liệu từ Realtime Database
    const snapshot = await realtimeDb.ref(node).once('value');
    const allIssues = snapshot.val();
    
    // Tìm tất cả issues có cùng status và issue_number
    const foundIssues = [];
    if (allIssues) {
      // Duyệt qua tất cả các issues để tìm các issues có status và issue_number tương ứng
      Object.keys(allIssues).forEach(key => {
        if (allIssues[key].test_state === issue_state && allIssues[key].issue_number === issue_number) {
          foundIssues.push({ id: key, ...allIssues[key] });
        }
      });
    }
    
    if (foundIssues.length === 0) {
      res.status(404).send('No issues found with this status and issue number');
    } else {
      res.send(foundIssues.sort(sortByTime));
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// PUT update issue by ID
apiRouter.put('/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status: issue_state } = req.body;
    
    if (!issue_state) {
      res.status(400).send('Status is required');
      return;
    }
    
    const node = default_node;
    
    // Kiểm tra xem issue có tồn tại không
    const snapshot = await realtimeDb.ref(`${node}/${id}`).once('value');
    const issue = snapshot.val();
    
    if (!issue) {
      res.status(404).send('Issue not found');
      return;
    }
    
    // Cập nhật status của issue
    await realtimeDb.ref(`${node}/${id}`).update({
      test_state: issue_state
    });
    
    res.status(200).send({ id, status: issue_state });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// DELETE issue by ID
apiRouter.delete('/issues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const node = default_node;
    
    // Kiểm tra xem issue có tồn tại không
    const snapshot = await realtimeDb.ref(`${node}/${id}`).once('value');
    const issue = snapshot.val();
    
    if (!issue) {
      res.status(404).send('Issue not found');
      return;
    }
    
    // Xóa issue
    await realtimeDb.ref(`${node}/${id}`).remove();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// Always return the main index.html for any other route
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/index.html'), {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});