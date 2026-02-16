# Excel Import Guide

## Method 1: Command-Line Import (Easiest)

### Steps:
1. **Make sure backend server is running:**
   ```bash
   cd server
   npm run dev
   ```

2. **Open a new terminal and run:**
   ```bash
   cd server
   npm run import -- --file=path/to/your/file.xlsx
   ```

### Examples:
```bash
# File in project root
npm run import -- --file=../beneficiaries.xlsx

# File with full path
npm run import -- --file="D:/Users/Ken/Documents/beneficiaries.xlsx"

# File in server/uploads folder
npm run import -- --file=uploads/beneficiaries.xlsx
```

### What happens:
- ✅ Reads your Excel file
- ✅ Processes monthly sheets (January 2019, February 2019, etc.)
- ✅ Imports data into database
- ✅ Shows progress in terminal
- ✅ Data appears in frontend automatically

---

## Method 2: API Upload (Advanced)

### Using curl:
```bash
curl -X POST http://localhost:4000/api/uploads/excel \
  -F "file=@path/to/your/file.xlsx"
```

### Using Postman:
1. Method: `POST`
2. URL: `http://localhost:4000/api/uploads/excel`
3. Body → form-data
4. Key: `file` (type: File)
5. Value: Select your Excel file
6. Click Send

---

## Excel File Format Requirements

Your Excel file should have:

### Sheet Names:
- Monthly sheets like: "January 2019", "February 2019", "March 2019", etc.
- Or: "Jan 2019", "Feb 2019", etc.

### Column Structure (in order):
1. **DATE** - Day of the month (e.g., 1, 2, 3...)
2. **Name** - Beneficiary name (required)
3. **Gender** - Male/Female (required)
4. **Barangay** - Barangay name
5. **Municipality** - Municipality name
6. **Contact** - Contact information
7. **Species** - Species type (e.g., Tilapia)
8. **Quantity** - Number of items
9. **Cost** - Cost value (will be multiplied by 1000)
10. **Implementation Type** - Implementation type
11. **Satisfaction** - Satisfaction level

### Example Excel Structure:
```
| DATE | Name          | Gender | Barangay | Municipality | ... |
|------|---------------|--------|----------|--------------|-----|
| 1    | Juan Dela Cruz| Male   | Poblacion| Clarin      | ... |
| 2    | Maria Santos  | Female | Tagbilaran| Tagbilaran | ... |
```

---

## Troubleshooting

### "File not found" error:
- Check the file path is correct
- Use quotes around paths with spaces: `--file="path with spaces/file.xlsx"`
- Use forward slashes `/` or double backslashes `\\` in Windows

### "No records imported":
- Check if sheet names contain month names
- Verify the first column header is "DATE"
- Make sure Name and Gender columns have data

### Data not showing in frontend:
- Refresh the browser page
- Check browser console for errors
- Verify backend server is running
- Check if data was actually imported (check terminal output)

---

## Quick Test

1. Place your Excel file somewhere accessible
2. Run: `cd server && npm run import -- --file=../your-file.xlsx`
3. Check terminal for import results
4. Open frontend: http://localhost:5173
5. Go to Database page
6. Your data should be there! 🎉

