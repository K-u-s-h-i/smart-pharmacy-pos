-- View all records
SELECT * FROM pharmacy_sales;

-- Total sales amount
SELECT SUM(total_amount) AS total_revenue
FROM pharmacy_sales;

-- Total sales by date
SELECT sale_date, SUM(total_amount) AS daily_sales
FROM pharmacy_sales
GROUP BY sale_date
ORDER BY sale_date;

-- Top 5 selling medicines by quantity
SELECT medicine_name, SUM(quantity) AS total_quantity
FROM pharmacy_sales
GROUP BY medicine_name
ORDER BY total_quantity DESC
LIMIT 5;

-- Category-wise sales
SELECT category, SUM(total_amount) AS category_sales
FROM pharmacy_sales
GROUP BY category;

-- Average order value
SELECT AVG(total_amount) AS avg_order_value
FROM pharmacy_sales;

-- Monthly revenue
SELECT MONTH(sale_date) AS month, SUM(total_amount) AS monthly_revenue
FROM pharmacy_sales
GROUP BY MONTH(sale_date)
ORDER BY month;

-- Low stock medicines (example threshold)
SELECT medicine_name, stock_quantity
FROM pharmacy_sales
WHERE stock_quantity < 10;

-- Expired medicines
SELECT medicine_name, expiry_date
FROM pharmacy_sales
WHERE expiry_date < CURDATE();
