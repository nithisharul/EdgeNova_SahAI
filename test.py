import pandas as pd
df = pd.read_csv("data/raw/kiva_loans.csv")
print(df.columns.tolist())
print(df.head(3))