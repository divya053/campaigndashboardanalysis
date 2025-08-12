import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const dbFile = path.join(process.cwd(), 'dashboard_data.db');
const db = new sqlite3.Database(dbFile);

app.get('/api/sheets', (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => row.name));
  });
});

app.get('/api/sheet/:name', (req, res) => {
  const tableName = req.params.name;
  db.all(`SELECT * FROM "${tableName}"`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/columns/:name', (req, res) => {
  const tableName = req.params.name;
  console.log(`Fetching columns for table: ${tableName}`);
  db.all(`PRAGMA table_info("${tableName}")`, [], (err, rows) => {
    if (err) {
      console.error(`Error fetching columns for ${tableName}:`, err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`Raw PRAGMA results for ${tableName}:`, rows);
    const mappedRows = rows.map(r => ({
      name: r.name,
      type: r.type,
      notnull: Boolean(r.notnull),
      defaultValue: r.dflt_value,
      isPrimaryKey: r.pk === 1
    }));
    console.log(`Mapped columns for ${tableName}:`, mappedRows);
    res.json(mappedRows);
  });
});

app.post('/api/sheet/:name', (req, res) => {
  const tableName = req.params.name;
  const payload = req.body || {};
  
  console.log(`Insert request for table: ${tableName}`);
  console.log('Payload:', payload);
  
  db.all(`PRAGMA table_info("${tableName}")`, [], (err, cols) => {
    if (err) {
      console.error(`Error fetching columns for ${tableName}:`, err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`Available columns for ${tableName}:`, cols.map(c => c.name));
    
    const columnNames = cols.map(c => c.name);
    const allowedEntries = Object.entries(payload).filter(([k, v]) => columnNames.includes(k));
    
    console.log('Allowed entries:', allowedEntries);
    
    if (allowedEntries.length === 0) {
      console.error('No valid columns provided for insert');
      return res.status(400).json({ error: 'No valid columns provided for insert.' });
    }
    
    const columns = allowedEntries.map(([k]) => `"${k}"`).join(', ');
    const placeholders = allowedEntries.map(() => '?').join(', ');
    const values = allowedEntries.map(([, v]) => v);
    const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`;
    
    console.log('SQL:', sql);
    console.log('Values:', values);
    
    db.run(sql, values, function(runErr) {
      if (runErr) {
        console.error('SQL execution error:', runErr);
        return res.status(500).json({ error: runErr.message });
      }
      
      console.log(`Insert successful. Last ID: ${this.lastID}`);
      return res.status(201).json({ success: true, lastID: this.lastID });
    });
  });
});

// Test endpoint to see database structure
app.get('/api/debug/:table', (req, res) => {
  const tableName = req.params.table;
  console.log(`Debug endpoint for table: ${tableName}`);
  
  // Get table info
  db.all(`PRAGMA table_info("${tableName}")`, [], (err, columns) => {
    if (err) {
      console.error(`Error in debug endpoint:`, err);
      return res.status(500).json({ error: err.message });
    }
    
    // Get sample data
    db.all(`SELECT * FROM "${tableName}" LIMIT 1`, [], (err2, sample) => {
      if (err2) {
        console.error(`Error getting sample data:`, err2);
        return res.status(500).json({ error: err2.message });
      }
      
      res.json({
        tableName,
        columns: columns,
        sampleData: sample,
        columnCount: columns.length,
        primaryKeys: columns.filter(c => c.pk === 1).map(c => c.name)
      });
    });
  });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
// app.listen(5001, () => console.log("Server running on http://localhost:5001"));