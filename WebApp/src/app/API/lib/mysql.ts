import mysql, { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function query<T extends RowDataPacket  | ResultSetHeader>(
    sql: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values?: any[]
): Promise<T[]>{
    if (sql.trim().toUpperCase().startsWith('SELECT')){
        const [rows] = await pool.execute(sql, values);
        return rows as T[]
    }else{
        const [result] = await pool.execute(sql, values);
        return [result as T]; 
    }
}
