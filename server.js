require('dotenv').config();
const express = require('express');
const Airtable = require('airtable');
const cors = require('cors'); // Zaroori: Frontend se connect karne ke liye

const app = express();
app.use(cors()); // Isse Netlify wala frontend isse baat kar payega
app.use(express.json());

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.BASE_ID);
const table = base(process.env.TABLE_NAME);

// 1. Get All Data
app.get('/api/data', async (req, res) => {
    try {
        const records = await table.select({ view: "Grid view" }).all();
        let summary = { lendTotal: 0, borrowTotal: 0, lendCount: 0, borrowCount: 0 };
        
        const data = records.map(r => {
            const f = r.fields;
            const total = Number(f.TotalAmount) || 0;
            if (f.RecordType === 'Lend') { summary.lendCount++; summary.lendTotal += total; }
            else { summary.borrowCount++; summary.borrowTotal += total; }
            return { id: r.id, ...f };
        });
        res.json({ data, summary });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Add Data (Updated)
app.post('/api/add', async (req, res) => {
    try {
        const { name, phone, principal, interestRate, interestType, recordType, startDate, totalAmount } = req.body;

        // Airtable columns ke exact names yahan likhein (Case-Sensitive)
        const newRecord = await table.create([
            {
                fields: {
                    "Name": name,
                    "Phone": phone,
                    "Principal": Number(principal), // Airtable me number hai toh Number() zaroori hai
                    "InterestRate": Number(interestRate),
                    "InterestType": interestType,
                    "RecordType": recordType, // Ensure karein ki ye 'Lend' ya 'Borrow' hi ho
                    "StartDate": startDate,
                }
            }
        ]);
        
        res.json(newRecord[0]);
    } catch (err) {
        console.error("Airtable Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Delete Data
app.delete('/api/delete/:id', async (req, res) => {
    try {
        await table.destroy(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));