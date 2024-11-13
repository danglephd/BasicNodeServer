const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;

const db = new sqlite3.Database('./database/gitlab_issue.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the gitlab_issue database.');
});

app.use(express.json());

// GET all issues
app.get('/issues', (req, res) => {
  db.all('SELECT * FROM ISSUE', (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal server error');
    } else {
      res.send(rows);
    }
  });
});

// GET single product by ID
app.get('/issues/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM ISSUE WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal server error');
    } else if (!row) {
      res.status(404).send('Product not found');
    } else {
      res.send(row);
    }
  });
});

// POST new product
app.post('/issues', (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) {
    res.status(400).send('Name and price are required');
  } else {
    const sql = 'INSERT INTO ISSUE(name, price) VALUES (?, ?)';
    db.run(sql, [name, price], function(err) {
      if (err) {
        console.error(err.message);
        res.status(500).send('Internal server error');
      } else {
        const id = this.lastID;
        res.status(201).send({ id, name, price });
      }
    });
  }
});

// PUT update product by ID
app.put('/issues/:id', (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  if (!name || !price) {
    res.status(400).send('Name and price are required');
  } else {
    const sql = 'UPDATE ISSUE SET name = ?, price = ? WHERE id = ?';
    db.run(sql, [name, price, id], function(err) {
      if (err) {
        console.error(err.message);
        res.status(500).send('Internal server error');
      } else if (this.changes === 0) {
        res.status(404).send('Product not found');
      } else {
        res.status(200).send({ id, name, price });
      }
    });
  }
});

// DELETE product by ID
app.delete('/issues/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM ISSUE WHERE id = ?', [id], function(err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal server error');
    } else if (this.changes === 0) {
      res.status(404).send('Product not found');
    } else {
      res.status(204).send();
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});