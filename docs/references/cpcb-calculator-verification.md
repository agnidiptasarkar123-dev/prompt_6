# CPCB AQI Calculator Workbook Verification Report

## 1. File Provenance & Cryptographic Verification
- **Official URL:** `https://cpcb.gov.in/upload/national-air-quality-index/AQI-Calculator.xls`
- **Download Date:** 2026-11-21 (2026-11-20T18:44:00Z UTC)
- **Local Path:** `docs/references/AQI-Calculator.xls`
- **File Format:** Microsoft Excel 97-2004 Workbook (BIFF8 / OLE2 Compound Binary Format)
- **File Size:** 46,080 bytes (45.0 KB)
- **SHA-256 Checksum:** `92eb788f7f61bd46edea1814a9e1b8f5dd75d05dfb88f34a460905bc07bd151a`

---

## 2. Workbook Structure & Sheet Inventory
- **Sheet1:** Populated calculation sheet ("Calculation of AQI"). 28 rows, 11 columns.
- **Sheet2:** Empty (0 rows, 0 columns).
- **Sheet3:** Empty (0 rows, 0 columns).

---

## 3. Cell Mapping & Actual Spreadsheet Formulas

### Input & Validation Cells
- `C8`: PM10 concentration input (24-hr avg, µg/m³)
- `E8`: PM10 validation check: `=IF(OR(ISBLANK(C8), (C8<=0)), 0, 1)`
- `C10`: PM2.5 concentration input (24-hr avg, µg/m³)
- `E10`: PM2.5 validation check: `=IF(OR(ISBLANK(C10), (C10<=0)), 0, 1)`
- `C12`: SO2 concentration input (24-hr avg, µg/m³)
- `E12`: SO2 validation check: `=IF(OR(ISBLANK(C12), (C12<=0)), 0, 1)`
- `C14`: NO2 concentration input (24-hr avg, µg/m³)
- `E14`: NO2 validation check: `=IF(OR(ISBLANK(C14), (C14<=0)), 0, 1)`
- `C16`: CO concentration input (max 8-hr avg, mg/m³)
- `E16`: CO validation check: `=IF(OR(ISBLANK(C16), (C16<=0)), 0, 1)`
- `C18`: O3 concentration input (max 8-hr avg, µg/m³)
- `E18`: O3 validation check: `=IF(OR(ISBLANK(C18), (C18<=0)), 0, 1)`
- `C20`: NH3 concentration input (24-hr avg, µg/m³)
- `E20`: NH3 validation check: `=IF(OR(ISBLANK(C20), (C20<=0)), 0, 1)`

### Sub-Index Output Cells (Column D)
- **D8 (PM10):**
  `=IF(ISBLANK(C8), 0, IF((C8<=50), C8, IF(AND((C8>50), (C8<=100)), C8, IF(AND((C8>100), (C8<=250)), (100+((((C8-100))*100)/150)), IF(AND((C8>250), (C8<=350)), (200+((C8-250))), IF(AND((C8>350), (C8<=430)), (300+(((C8-350))*((100/80)))), IF((C8>430), (400+(((C8-430))*((100/80)))))))))))`
- **D10 (PM2.5):**
  `=IF(ISBLANK(C10), 0, IF((C10<=30), ((C10*50)/30), IF(AND((C10>30), (C10<=60)), (50+((((C10-30))*50)/30)), IF(AND((C10>60), (C10<=90)), (100+((((C10-60))*100)/30)), IF(AND((C10>90), (C10<=120)), (200+(((C10-90))*((100/30)))), IF(AND((C10>120), (C10<=250)), (300+(((C10-120))*((100/130)))), IF((C10>250), (400+(((C10-250))*((100/130)))))))))))`
- **D12 (SO2):**
  `=IF(ISBLANK(C12), 0, IF((C12<=40), ((C12*50)/40), IF(AND((C12>40), (C12<=80)), (50+((((C12-40))*50)/40)), IF(AND((C12>80), (C12<=380)), (100+((((C12-80))*100)/300)), IF(AND((C12>380), (C12<=800)), (200+(((C12-380))*((100/420)))), IF(AND((C12>800), (C12<=1600)), (300+(((C12-800))*((100/800)))), IF((C12>1600), (400+(((C12-1600))*((100/800)))))))))))`
- **D14 (NO2):**
  `=IF(ISBLANK(C14), 0, IF((C14<=40), ((C14*50)/40), IF(AND((C14>40), (C14<=80)), (50+((((C14-40))*50)/40)), IF(AND((C14>80), (C14<=180)), (100+((((C14-80))*100)/100)), IF(AND((C14>180), (C14<=280)), (200+(((C14-180))*((100/100)))), IF(AND((C14>280), (C14<=400)), (300+(((C14-280))*((100/120)))), IF((C14>400), (400+(((C14-400))*((100/120)))))))))))`
- **D16 (CO):**
  `=IF(ISBLANK(C16), 0, IF((C16<=1), ((C16*50)/1), IF(AND((C16>1), (C16<=2)), (50+((((C16-1))*50)/1)), IF(AND((C16>2), (C16<=10)), (100+((((C16-2))*100)/8)), IF(AND((C16>10), (C16<=17)), (200+(((C16-10))*((100/7)))), IF(AND((C16>17), (C16<=34)), (300+(((C16-17))*((100/17)))), IF((C16>34), (400+(((C16-34))*((100/17)))))))))))`
- **D18 (O3):**
  `=IF(ISBLANK(C18), 0, IF((C18<=50), ((C18*50)/50), IF(AND((C18>50), (C18<=100)), (50+((((C18-50))*50)/50)), IF(AND((C18>100), (C18<=168)), (100+((((C18-100))*100)/68)), IF(AND((C18>168), (C18<=208)), (200+(((C18-168))*((100/40)))), IF(AND((C18>208), (C18<=748)), (300+(((C18-208))*((100/539)))), IF((C18>748), (400+(((C18-400))*((100/539)))))))))))`
- **D20 (NH3):**
  `=IF(ISBLANK(C20), 0, IF((C20<=200), ((C20*50)/200), IF(AND((C20>200), (C20<=400)), (50+((((C20-200))*50)/200)), IF(AND((C20>400), (C20<=800)), (100+((((C20-400))*100)/400)), IF(AND((C20>800), (C20<=1200)), (200+(((C20-800))*((100/400)))), IF(AND((C20>1200), (C20<=1800)), (300+(((C20-1200))*((100/600)))), IF((C20>1800), (400+(((C20-1800))*((100/600)))))))))))`

### Overall AQI Output Cell
- **G11:**
  `=IF(AND(OR(((E8)=1), ((E10)=1)), ((((((((E8+E10)+E12)+E14)+E16)+E18)+E20))>=3)), MAX(D8, D10, D12, D14, D16, D18, D20), "Atleast 3 inputs*")`

---

## 4. Key Scientific Discrepancies Uncovered in the Original Workbook
1. **Lead (Pb) Omission:**  
   Lead (Pb) is completely absent from `AQI-Calculator.xls`. There is no row, cell, formula, or check for Pb in the spreadsheet, even though Pb is an official parameter in CUPS/82/2014-15 Table 3.11.
2. **Severe Range Interpolation Slope:**  
   In all pollutants, the workbook calculates Severe sub-indices using the Very Poor slope divisor $\Delta_{VP}$:
   $$\text{SubIndex}_{\text{Severe}} = 400 + (C_p - BP_{Lo}) \times \frac{100}{\Delta_{VP}}$$
   This means the concentration where the formula evaluates to 500 is:
   - $\text{PM}_{10}$: $430 + 80 = 510\,\mu\text{g/m}^3$
   - $\text{PM}_{2.5}$: $250 + 130 = 380\,\mu\text{g/m}^3$
   - $\text{SO}_2$: $1600 + 800 = 2400\,\mu\text{g/m}^3$
   - $\text{NO}_2$: $400 + 120 = 520\,\mu\text{g/m}^3$
   - $\text{CO}$: $34.0 + 17.0 = 51.0\,\text{mg/m}^3$
   - $\text{NH}_3$: $1800 + 600 = 2400\,\mu\text{g/m}^3$
3. **Severe Ozone Formula Typo:**  
   In cell `D18`, the Severe clause reads: `(400+(((C18-400))*((100/539))))`. The spreadsheet author subtracted 400 instead of 748, and divided by 539 instead of 540. HawaSaathi corrects this typo while adhering strictly to Table 3.11 statutory breakpoints.
