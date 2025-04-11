const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors')
require('dotenv').config()
const app = express();
const { realtimeDb } = require('./config/firebase-config');

app.use(cors())
const port = process.env.PORT || 3000;
const db_host = process.env.database_HOST || './database/gitlab_issue.db';

const default_node = 'issues';

const db_sqlite = new sqlite3.Database(db_host, (err) => {
  if (err) {
    console.error(err.message);
    console.error(db_host);
    return
  }
  console.log(`Connected to ${db_host}.`);
});

app.use(express.json());

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
app.get('/issues', async (req, res) => {
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
app.get('/issues/:issue', async (req, res) => {
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
app.post('/issues/status', async (req, res) => {
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
app.post('/issues', async (req, res) => {
  try {
    const {
      issue_number: issue_number,
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
app.put('/issues/:id', async (req, res) => {
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
app.delete('/issues/:id', async (req, res) => {
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

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});