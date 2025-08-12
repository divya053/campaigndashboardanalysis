import pandas as pd
import sqlite3
import zipfile
import os

excel_file = "Cooperative + General Dashboard Data 2025.xlsx"  
sqlite_db = "dashboard_data.db"
zip_file = "dashboard_data.zip"

sheets = pd.read_excel(excel_file, sheet_name=None, engine="openpyxl")
conn = sqlite3.connect(sqlite_db)

for sheet_name, df in sheets.items():
    table_name = sheet_name.strip().replace(" ", "_").replace("-", "_")
    df.to_sql(table_name, conn, if_exists="replace", index=False)
    print(f"Inserted {len(df)} rows into '{table_name}' table.")
conn.close()

with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipf.write(sqlite_db, os.path.basename(sqlite_db))

print(f"Database created: {sqlite_db}")
print(f"Zipped database: {zip_file}")
