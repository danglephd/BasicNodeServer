import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeFirebase, getDatabase } from './config/firebase-config.js';
import { ref, get, set, update, remove } from 'firebase/database';

dotenv.config();
const app = express();
const firebaseApp = initializeFirebase(); // Lấy Firebase App
const realtimeDb = getDatabase(firebaseApp); // Lấy Realtime Database từ Firebase App

app.use(cors());
const port = process.env.PORT || 3000;

const default_node = 'issues';

app.use(express.json());

function sortByTime(a, b) {
  if (a.duedate === " " || a.duedate === "") {
    return 1;
  }

  if (b.duedate === " " || b.duedate === "") {
    return -1;
  }

  let valueA = Date.parse(a.duedate);
  let valueB = Date.parse(b.duedate);
  return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
}

// Welcome
app.get('/', (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!');
});

// GET all issues
app.get('/issues', async (req, res) => {
  try {
    const nodeRef = ref(realtimeDb, default_node);
    const snapshot = await get(nodeRef);
    const allIssues = snapshot.val();

    const issues = [];
    if (allIssues) {
      Object.keys(allIssues).forEach(key => {
        issues.push({ id: key, ...allIssues[key] });
      });
    }

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
    const nodeRef = ref(realtimeDb, default_node);
    const snapshot = await get(nodeRef);
    const allIssues = snapshot.val();

    const foundIssues = [];
    if (allIssues) {
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
    const nodeRef = ref(realtimeDb, default_node);
    const snapshot = await get(nodeRef);
    const allIssues = snapshot.val();

    const foundIssues = [];
    if (allIssues) {
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

    const nodeRef = ref(realtimeDb, default_node);
    const snapshot = await get(nodeRef);
    const allIssues = snapshot.val();

    const foundIssues = [];
    if (allIssues) {
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

    const nodeRef = ref(realtimeDb, `${default_node}/${id}`);
    const snapshot = await get(nodeRef);
    const issue = snapshot.val();

    if (!issue) {
      res.status(404).send('Issue not found');
      return;
    }

    await update(nodeRef, {
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
    const nodeRef = ref(realtimeDb, `${default_node}/${id}`);
    const snapshot = await get(nodeRef);
    const issue = snapshot.val();

    if (!issue) {
      res.status(404).send('Issue not found');
      return;
    }

    await remove(nodeRef);

    res.status(204).send();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});