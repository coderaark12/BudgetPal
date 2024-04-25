import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import session from 'express-session';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import {Server} from 'socket.io';
import http from 'http';-

dotenv.config();
const port = process.env.PORT;
const app = express();

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: process.env.DATABASE,
    password: process.env.PASS,
    port: process.env.DBMS_PORT,
});
db.connect();

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true,
}));
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
        console.log(file);
    }
});
const upload = multer({ storage: storage });

app.post("/signup", async (req, res) => {
    const table = req.body.fname + req.body.Password;
    try {
        await db.query(
            "INSERT INTO user_data (fname,lname,gender,date_of_birth,email,password,tablename) values($1,$2,$3,$4,$5,$6,$7)",
            [req.body.fname, req.body.lname, req.body.gender, req.body.DOB, req.body.mail, req.body.Password, table]
        );
        await db.query(`CREATE TABLE ${table + 'transaction'} (
            id SERIAL PRIMARY KEY,
            benpayname VARCHAR(100) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            category text NOT NULL,
            transaction_date DATE NOT NULL
        );`
        );
        await db.query(`CREATE TABLE ${table + 'Income'} (
            id SERIAL PRIMARY KEY,
            payee VARCHAR(100) NOT NULL,
            transaction_date DATE NOT NULL,
            amount text NOT NULL
        );`
        );
        await db.query(`CREATE TABLE ${table + 'BillPay'} (
            id SERIAL PRIMARY KEY,
            ben_name VARCHAR(100) NOT NULL,
            transaction_date DATE NOT NULL,
            amount DECIMAL(10, 2) NOT NULL
            );`
        );
        await db.query(`CREATE TABLE ${table + 'cards'} (
                id SERIAL PRIMARY KEY,
                card_number VARCHAR(16) NOT NULL,
                bank VARCHAR(100) NOT NULL,
                expiry_month INT NOT NULL,
                expiry_year INT NOT NULL
);`
        );
        res.render("login.ejs");

    } catch (err) {
        console.log(err);
        res.render('index.ejs', {
            error: "Some error Occured! Please Try again",
        });
    }
});
app.post("/sign_up", (req, res) => {
    res.redirect("/");
});
app.post("/sign_Up", (req, res) => {
    res.redirect("/");
});
app.post("/login", async (req, res) => {
    const emailid = req.body.mail;
    const pass = req.body.Password;
    req.session.pass = pass;
    console.log(req.session.pass);

    try {
        // Consolidated query to fetch all required fields
        const userData = await db.query(
            "SELECT fname, lname, gender, total_bal FROM user_data WHERE password = $1 AND email = $2",
            [pass, emailid]
        );
        console.log(userData);
        if (userData.rows.length > 0) {
            const { fname, lname, gender, total_bal } = userData.rows[0];
            const name = fname + " " + lname;
            req.session.name = name;
            req.session.gender = gender;

            req.session.table = fname + pass;

            const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${req.session.table+'transaction'}`);

        const categoryArray = [];
        const amountArray = [];
        const benArray = [];
        const dateArray = [];
        const arr = [];

        TransactionData.rows.forEach(row => {
            categoryArray.push(row.category);
            amountArray.push(row.amount);
            benArray.push(row.benpayname);
            dateArray.push(row.transaction_date);
        });
            if (categoryArray.length < 7) {
                for (let i = categoryArray.length - 1; i >= 0; i--) {
                    if (categoryArray[i].toLowerCase() === 'received') {
                        arr.push(+amountArray[i]);
                    } else if (categoryArray[i].toLowerCase() === 'paid') {
                        arr.push(-amountArray[i]);
                    }
                }
            } else {
                for (let i = categoryArray.length - 1; i > categoryArray.length - 8; i--) {
                    if (categoryArray[i].toLowerCase() === 'received') {
                        arr.push(+amountArray[i]);
                    } else if (categoryArray[i].toLowerCase() === 'paid') {
                        arr.push(-amountArray[i]);
                    }
                }
            }
            const IncomeData = await db.query(`SELECT payee, transaction_date, amount FROM ${req.session.table + 'income'}`);


            const pay = [];
            const tran = [];
            const am = [];

            IncomeData.rows.forEach(row => {
                pay.push(row.payee);
                tran.push(row.transaction_date);
                am.push(row.amount);
            });

            const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
            const card = [];
            const bnk = [];
            const ex_month = [];
            const ex_year = [];

            CardData.rows.forEach(row => {
                card.push(row.card_number);
                bnk.push(row.bank);
                ex_month.push(row.expiry_month);
                ex_year.push(row.expiry_year);

            });

            const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
            const benf = [];
            const trans = [];
            const ru = [];

            billpayData.rows.forEach(row => {
                benf.push(row.ben_name);
                trans.push(row.transaction_date);
                ru.push(row.amount);
            });
            const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
            if(!result.rows[0].image){
                res.render('dash.ejs', {
                    Name: req.session.name,
                    Gender: req.session.gender,
                    Bal: total_bal,
                    amountsArray: arr,
                    trans: tran,
                    amnt: am,
                    payees: pay,
                    card_details: card,
                    Bank: bnk,
                    Expiry_mon: ex_month,
                    Expiry_year: ex_year,
                    benf_name: benf,
                    transac: trans,
                    Amount: ru,
                    BenArray:benArray,
                    DateArray:dateArray,
                });
            }else{

            const imageData = result.rows[0].image;
            const buffer = Buffer.from(imageData, "binary");
            const dataURI = buffer.toString();
            res.render('dash.ejs', {
                Name: req.session.name,
                Gender: req.session.gender,
                Bal: total_bal,
                amountsArray: arr,
                trans: tran,
                amnt: am,
                payees: pay,
                card_details: card,
                Bank: bnk,
                Expiry_mon: ex_month,
                Expiry_year: ex_year,
                benf_name: benf,
                transac: trans,
                Amount: ru,
                ImageData: dataURI,
                BenArray: benArray,     
                DateArray:dateArray
            });
        }   
        } else {
            res.render("login.ejs", {
                error: "Invalid email or password!",
            });
        }
    } catch (error) {
        res.render('login.ejs', {
            error: "Some error occurred! Please try again.",
        });
    }
});
app.post('/profile', async (req, res) => {
    const pass = req.session.pass;
    const firstname = await db.query(
        "SELECT fname FROM user_data WHERE  password = $1", [pass]
    );
    const gen = await db.query(
        "SELECT gender FROM user_data WHERE password = $1", [pass]
    );
    const lastname = await db.query(
        "SELECT lname FROM user_data WHERE password = $1", [pass]
    );
    if (firstname.rows.length > 0 && lastname.rows.length > 0) {
        const name = firstname.rows[0].fname + " " + lastname.rows[0].lname;
        const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
        const userData = await db.query("select fname, lname, date_of_birth,email from user_data where password=$1", [req.session.pass]);
        if (!result.rows[0].image) {
            // No image found for the user
            res.render('profile.ejs', {
                Name: req.session.name,
                Gender: req.session.gender,
                First:userData.rows[0].fname,
                Last: userData.rows[0].lname,
                DOB: userData.rows[0].date_of_birth,
                mail: userData.rows[0].email,
            });
        } else {
            console.log(userData.rows[0].fname)
            const imageData = result.rows[0].image;
            const buffer = Buffer.from(imageData, "binary");
            const dataURI = buffer.toString();
            res.render("profile.ejs", {
                Name: name,
                Gender: (gen.rows[0].gender),
                ImageData: dataURI,
                First:userData.rows[0].fname,
                Last: userData.rows[0].lname,
                DOB: userData.rows[0].date_of_birth,
                mail: userData.rows[0].email,
            });
        }

    }
});
app.post("/dash", async (req, res) => {
    const amount = await db.query(`SELECT total_bal FROM user_data WHERE password = $1`, [req.session.pass]);

    const amounts = await db.query(`SELECT amount FROM ${req.session.table + 'Transaction'}`);
    const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${req.session.table+'transaction'}`);

        const categoryArray = [];
        const amountArray = [];
        const benArray = [];
        const dateArray = [];

        TransactionData.rows.forEach(row => {
            categoryArray.push(row.category);
            amountArray.push(row.amount);
            benArray.push(row.benpayname);
            dateArray.push(row.transaction_date);
        });
    const arr = []
    if (categoryArray.length < 7) {
        for (let i = categoryArray.length - 1; i >= 0; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    } else {
        for (let i = categoryArray.length - 1; i > categoryArray.length - 8; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    }

    const IncomeData = await db.query(`SELECT payee,transaction_date,amount FROM ${req.session.table + 'income'}`);
    const pay = [];
    const tran = [];
    const am = [];

    IncomeData.rows.forEach(row => {
        pay.push(row.payee);
        tran.push(row.transaction_date);
        am.push(row.amount);
    });

    const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
    const card = [];
    const bnk = [];
    const ex_month = [];
    const ex_year = [];

    CardData.rows.forEach(row => {
        card.push(row.card_number);
        bnk.push(row.bank);
        ex_month.push(row.expiry_month);
        ex_year.push(row.expiry_year);

    });

    const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
    const benf = [];
    const trans = [];
    const ru = [];

    billpayData.rows.forEach(row => {
        benf.push(row.ben_name);
        trans.push(row.transaction_date);
        ru.push(row.amount);
    });

    const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
    if(!result.rows[0].image){
        res.render('dash.ejs', {
            Name: req.session.name,
            Gender: req.session.gender,
            Bal: amount.rows[0].total_bal,
            amountsArray: arr,
            trans: tran,
            amnt: am,
            payees: pay,
            card_details: card,
            Bank: bnk,
            Expiry_mon: ex_month,
            Expiry_year: ex_year,
            benf_name: benf,
            transac: trans,
            Amount: ru,
            BenArray:benArray.reverse(),
            DateArray:dateArray.reverse()
        });
    }else{
    const imageData = result.rows[0].image;
    const buffer = Buffer.from(imageData, "binary");
    const dataURI = buffer.toString();

    res.render('dash.ejs', {
        Name: req.session.name,
        Gender: req.session.gender,
        Bal: amount.rows[0].total_bal,
        amountsArray: arr,
        trans: tran,
        amnt: am,
        payees: pay,
        card_details: card,
        Bank: bnk,
        Expiry_mon: ex_month,
        Expiry_year: ex_year,
        benf_name: benf,
        transac: trans,
        Amount: ru,
        ImageData: dataURI,
        BenArray: benArray,
        DateArray:dateArray
    });
}
});
app.post("/track", async (req, res) => {
    const amount = await db.query(`SELECT total_bal FROM user_data WHERE password = $1`, [req.session.pass]);

    const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${req.session.table+'transaction'}`);

        const categoryArray = [];
        const amountArray = [];
        const benArray = [];
        const dateArray = [];

        TransactionData.rows.forEach(row => {
            categoryArray.push(row.category);
            amountArray.push(row.amount);
            benArray.push(row.benpayname);
            dateArray.push(row.transaction_date);
        });
    
    const arr = []
    if (categoryArray.length < 7) {
        for (let i = categoryArray.length - 1; i >= 0; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    } else {
        for (let i = categoryArray.length - 1; i >= 0; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    }

    const IncomeData = await db.query(`SELECT payee,transaction_date,amount FROM ${req.session.table + 'income'}`);
    const pay = [];
    const tran = [];
    const am = [];

    IncomeData.rows.forEach(row => {
        pay.push(row.payee);
        tran.push(row.transaction_date);
        am.push(row.amount);
    });

    const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
    const card = [];
    const bnk = [];
    const ex_month = [];
    const ex_year = [];

    CardData.rows.forEach(row => {
        card.push(row.card_number);
        bnk.push(row.bank);
        ex_month.push(row.expiry_month);
        ex_year.push(row.expiry_year);

    });

    const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
    const benf = [];
    const trans = [];
    const ru = [];

    billpayData.rows.forEach(row => {
        benf.push(row.ben_name);
        trans.push(row.transaction_date);
        ru.push(row.amount);
    });
    const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
            
    if(!result.rows[0].image){
        res.render('track.ejs', {
            Name: req.session.name,
        Gender: req.session.gender,
        Bal: amount.rows[0].total_bal,
        amountsArray: arr,
        trans: tran,
        amnt: am,
        payees: pay,
        card_details: card,
        Bank: bnk,
        Expiry_mon: ex_month,
        Expiry_year: ex_year,
        benf_name: benf,
        transac: trans,
        Amount: ru,
        BenArray:benArray,
        DateArray:dateArray,
        });
    }else{

    const imageData = result.rows[0].image;
    const buffer = Buffer.from(imageData, "binary");
    const dataURI = buffer.toString();
    res.render('track.ejs', {
        Name: req.session.name,
        Gender: req.session.gender,
        Bal: amount.rows[0].total_bal,
        amountsArray: arr,
        trans: tran,
        amnt: am,
        payees: pay,
        card_details: card,
        Bank: bnk,
        Expiry_mon: ex_month,
        Expiry_year: ex_year,
        benf_name: benf,
        transac: trans,
        Amount: ru,
        ImageData: dataURI,
        BenArray:benArray.reverse(),
        DateArray:dateArray.reverse(),

    });
}

   
});
app.post("/add_income", async (req, res) => {
    try {

        // Insert income data into the database
        await db.query(`
            INSERT INTO ${req.session.table + 'Income'} (payee, transaction_date, amount)
            VALUES ($1, $2, $3)
        `, [
            req.body.payee_name,
            req.body.income_date,
            req.body.amount
        ]);

        const tot = await db.query("SELECT total_bal FROM user_data where password = $1", [req.session.pass]);
        // Update total balance in the user_data table
        const total = (+req.body.amount) + (+(tot.rows[0].total_bal));
        await db.query(`
            UPDATE user_data
            SET total_bal = $1
            WHERE password = $2
        `, [
            total,
            req.session.pass
        ]);

        const amount = await db.query(`SELECT total_bal FROM user_data WHERE password = $1`, [req.session.pass]);

        const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${req.session.table+'transaction'}`);

        const categoryArray = [];
        const amountArray = [];
        const benArray = [];
        const dateArray = [];

        TransactionData.rows.forEach(row => {
            categoryArray.push(row.category);
            amountArray.push(row.amount);
            benArray.push(row.benpayname);
            dateArray.push(row.transaction_date);
        });
    

        const arr = []
        if (categoryArray.length < 7) {
            for (let i = categoryArray.length - 1; i >= 0; i--) {
                if (categoryArray[i].toLowerCase() === 'received') {
                    arr.push(+amountArray[i]);
                } else if (categoryArray[i].toLowerCase() === 'paid') {
                    arr.push(-amountArray[i]);
                }
            }
        } else {
            for (let i = categoryArray.length - 1; i >= 0; i--) {
                if (categoryArray[i].toLowerCase() === 'received') {
                    arr.push(+amountArray[i]);
                } else if (categoryArray[i].toLowerCase() === 'paid') {
                    arr.push(-amountArray[i]);
                }
            }
        }

        const IncomeData = await db.query(`SELECT payee,transaction_date,amount FROM ${req.session.table + 'income'}`);
        const pay = [];
        const tran = [];
        const am = [];

        IncomeData.rows.forEach(row => {
            pay.push(row.payee);
            tran.push(row.transaction_date);
            am.push(row.amount);
        });

        const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
        const card = [];
        const bnk = [];
        const ex_month = [];
        const ex_year = [];

        CardData.rows.forEach(row => {
            card.push(row.card_number);
            bnk.push(row.bank);
            ex_month.push(row.expiry_month);
            ex_year.push(row.expiry_year);

        });

        const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
        const benf = [];
        const trans = [];
        const ru = [];

        billpayData.rows.forEach(row => {
            benf.push(row.ben_name);
            trans.push(row.transaction_date);
            ru.push(row.amount);
        });

        const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
            
        if(!result.rows[0].image){
            res.render('track.ejs', {
                Name: req.session.name,
            Gender: req.session.gender,
            Bal: amount.rows[0].total_bal,
            amountsArray: arr,
            trans: tran,
            amnt: am,
            payees: pay,
            card_details: card,
            Bank: bnk,
            Expiry_mon: ex_month,
            Expiry_year: ex_year,
            benf_name: benf,
            transac: trans,
            Amount: ru,
            BenArray:benArray,
            DateArray:dateArray,
            });
        }else{
    
        const imageData = result.rows[0].image;
        const buffer = Buffer.from(imageData, "binary");
        const dataURI = buffer.toString();
        res.render('track.ejs', {
            Name: req.session.name,
            Gender: req.session.gender,
            Bal: amount.rows[0].total_bal,
            amountsArray: arr,
            trans: tran,
            amnt: am,
            payees: pay,
            card_details: card,
            Bank: bnk,
            Expiry_mon: ex_month,
            Expiry_year: ex_year,
            benf_name: benf,
            transac: trans,
            Amount: ru,
            ImageData: dataURI,
            BenArray:benArray.reverse(),
            DateArray:dateArray.reverse(),
    
        });
    }


    } catch (error) {
        console.error("Error adding income:", error);
        // Handle the error and render an error page or redirect to a specific route

        res.status(500).send("An error occurred while adding income.");
    }
});

app.post("/add_card", async (req, res) => {

    // Insert income data into the database
    await db.query(`
            INSERT INTO ${req.session.table + 'cards'} (card_number, bank, expiry_month, expiry_year)
            VALUES ($1, $2, $3, $4)
        `, [
        req.body.card_number,
        req.body.bank,
        req.body.expiry_month,
        req.body.expiry_year
    ]);

    const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${req.session.table+'transaction'}`);

    const categoryArray = [];
    const amountArray = [];
    const benArray = [];
    const dateArray = [];

    TransactionData.rows.forEach(row => {
        categoryArray.push(row.category);
        amountArray.push(row.amount);
        benArray.push(row.benpayname);
        dateArray.push(row.transaction_date);
    });


    const arr = []
        if (categoryArray.length < 7) {
            for (let i = categoryArray.length - 1; i >= 0; i--) {
                if (categoryArray[i].toLowerCase() === 'received') {
                    arr.push(+amountArray[i]);
                } else if (categoryArray[i].toLowerCase() === 'paid') {
                    arr.push(-amountArray[i]);
                }
            }
        } else {
            for (let i = categoryArray.length - 1; i >= 0; i--) {
                if (categoryArray[i].toLowerCase() === 'received') {
                    arr.push(+amountArray[i]);
                } else if (categoryArray[i].toLowerCase() === 'paid') {
                    arr.push(-amountArray[i]);
                }
            }
        }

        const IncomeData = await db.query(`SELECT payee,transaction_date,amount FROM ${req.session.table + 'income'}`);
        const pay = [];
        const tran = [];
        const am = [];

        IncomeData.rows.forEach(row => {
            pay.push(row.payee);
            tran.push(row.transaction_date);
            am.push(row.amount);
        });

        const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
        const card = [];
        const bnk = [];
        const ex_month = [];
        const ex_year = [];

        CardData.rows.forEach(row => {
            card.push(row.card_number);
            bnk.push(row.bank);
            ex_month.push(row.expiry_month);
            ex_year.push(row.expiry_year);

        });

        const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
        const benf = [];
        const trans = [];
        const ru = [];

        billpayData.rows.forEach(row => {
            benf.push(row.ben_name);
            trans.push(row.transaction_date);
            ru.push(row.amount);
        });

        const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
            
        if(!result.rows[0].image){
            res.render('track.ejs', {
            Name: req.session.name,
            Gender: req.session.gender,
            amountsArray: arr,
            trans: tran,
            amnt: am,
            payees: pay,
            card_details: card,
            Bank: bnk,
            Expiry_mon: ex_month,
            Expiry_year: ex_year,
            benf_name: benf,
            transac: trans,
            Amount: ru,
            BenArray:benArray,
            DateArray:dateArray,
            });
        }else{
    
        const imageData = result.rows[0].image;
        const buffer = Buffer.from(imageData, "binary");
        const dataURI = buffer.toString();
        res.render('track.ejs', {
            Name: req.session.name,
            Gender: req.session.gender,
            amountsArray: arr,
            trans: tran,
            amnt: am,
            payees: pay,
            card_details: card,
            Bank: bnk,
            Expiry_mon: ex_month,
            Expiry_year: ex_year,
            benf_name: benf,
            transac: trans,
            Amount: ru,
            ImageData: dataURI,
            BenArray:benArray.reverse(),
            DateArray:dateArray.reverse(),
    
        });
    }
});
app.post("/add_bill", async (req, res) => {
    await db.query(`
            INSERT INTO ${req.session.table + 'billpay'} (ben_name, transaction_date, amount)
            VALUES ($1, $2, $3)
        `, [
        req.body.beneficiary_name,
        req.body.transaction_date,
        req.body.amount,
    ]);
    const amount = await db.query(`SELECT total_bal FROM user_data WHERE password = $1`, [req.session.pass]);

    const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${req.session.table+'transaction'}`);

    const categoryArray = [];
    const amountArray = [];
    const benArray = [];
    const dateArray = [];

    TransactionData.rows.forEach(row => {
        categoryArray.push(row.category);
        amountArray.push(row.amount);
        benArray.push(row.benpayname);
        dateArray.push(row.transaction_date);
    });


    const arr = []
    if (categoryArray.length < 7) {
        for (let i = categoryArray.length - 1; i >= 0; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    } else {
        for (let i = categoryArray.length - 1; i >= 0; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    }

    const IncomeData = await db.query(`SELECT payee,transaction_date,amount FROM ${req.session.table + 'income'}`);
    const pay = [];
    const tran = [];
    const am = [];

    IncomeData.rows.forEach(row => {
        pay.push(row.payee);
        tran.push(row.transaction_date);
        am.push(row.amount);
    });

    const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
    const card = [];
    const bnk = [];
    const ex_month = [];
    const ex_year = [];

    CardData.rows.forEach(row => {
        card.push(row.card_number);
        bnk.push(row.bank);
        ex_month.push(row.expiry_month);
        ex_year.push(row.expiry_year);

    });

    const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
    const benf = [];
    const trans = [];
    const ru = [];

    billpayData.rows.forEach(row => {
        benf.push(row.ben_name);
        trans.push(row.transaction_date);
        ru.push(row.amount);
    });

    const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
            
    if(!result.rows[0].image){
        res.render('track.ejs', {
        Name: req.session.name,
        Gender: req.session.gender,
        Bal: amount.rows[0].total_bal,
        amountsArray: arr,
        trans: tran,
        amnt: am,
        payees: pay,
        card_details: card,
        Bank: bnk,
        Expiry_mon: ex_month,
        Expiry_year: ex_year,
        benf_name: benf,
        transac: trans,
        Amount: ru,
        BenArray:benArray,
        DateArray:dateArray,
        });
    }else{

    const imageData = result.rows[0].image;
    const buffer = Buffer.from(imageData, "binary");
    const dataURI = buffer.toString();
    res.render('track.ejs', {
        Name: req.session.name,
        Gender: req.session.gender,
        Bal: amount.rows[0].total_bal,
        amountsArray: arr,
        trans: tran,
        amnt: am,
        payees: pay,
        card_details: card,
        Bank: bnk,
        Expiry_mon: ex_month,
        Expiry_year: ex_year,
        benf_name: benf,
        transac: trans,
        Amount: ru,
        ImageData: dataURI,
        BenArray:benArray.reverse(),
        DateArray:dateArray.reverse(),

    });
}
});
app.post("/add_transaction", async (req, res) => {
    try {
        const password = req.session.pass;
        const userData = await db.query('SELECT fname FROM user_data WHERE password = $1', [req.session.pass]);
        const tableName = req.session.table + 'Transaction';

        await db.query(`INSERT INTO ${tableName} (benpayname, category, amount,transaction_date) VALUES($1, $2, $3,$4)`, [
            req.body.beneficiary_or_payee_name,
            req.body.category,
            req.body.amount,
            req.body.t_date
        ]);

        const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${tableName}`);

        let totalReceived = 0;
        let totalPaid = 0;
        const categoryArray = [];
        const amountArray = [];
        const benArray = [];
        const dateArray = [];

        TransactionData.rows.forEach(row => {
            categoryArray.push(row.category);
            amountArray.push(row.amount);
            benArray.push(row.benpayname);
            dateArray.push(row.transaction_date);
        });

        
        const arr = []
        if (categoryArray.length < 7) {
            for (let i = categoryArray.length - 1; i >= 0; i--) {
                if (categoryArray[i].toLowerCase() === 'received') {
                    arr.push(+amountArray[i]);
                } else if (categoryArray[i].toLowerCase() === 'paid') {
                    arr.push(-amountArray[i]);
                }
            }
        } else {
            for (let i = categoryArray.length - 1; i >= 0; i--) {
                if (categoryArray[i].toLowerCase() === 'received') {
                    arr.push(+amountArray[i]);
                } else if (categoryArray[i].toLowerCase() === 'paid') {
                    arr.push(-amountArray[i]);
                }
            }
        }
        let sum = 0;
        arr.forEach(num => {
            sum += num;
        });

        await db.query(`UPDATE user_data SET total_bal = $1 WHERE password = $2`, [sum, password]);

        const amount = await db.query(`SELECT total_bal FROM user_data WHERE password = $1`, [req.session.pass]);


        const IncomeData = await db.query(`SELECT payee,transaction_date,amount FROM ${req.session.table + 'income'}`);
        const pay = [];
        const tran = [];
        const am = [];

        IncomeData.rows.forEach(row => {
            pay.push(row.payee);
            tran.push(row.transaction_date);
            am.push(row.amount);
        });

        const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
        const card = [];
        const bnk = [];
        const ex_month = [];
        const ex_year = [];

        CardData.rows.forEach(row => {
            card.push(row.card_number);
            bnk.push(row.bank);
            ex_month.push(row.expiry_month);
            ex_year.push(row.expiry_year);

        });

        const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
        const benf = [];
        const trans = [];
        const ru = [];

        billpayData.rows.forEach(row => {
            benf.push(row.ben_name);
            trans.push(row.transaction_date);
            ru.push(row.amount);
        });
        res.render('track.ejs', {
            Name: req.session.name,
            Gender: req.session.gender,
            Bal: amount.rows[0].total_bal,
            amountsArray: arr,
            trans: tran,
            amnt: am,
            payees: pay,
            card_details: card,
            Bank: bnk,
            Expiry_mon: ex_month,
            Expiry_year: ex_year,
            benf_name: benf,
            transac: trans,
            Amount: ru,
            BenArray:benArray.reverse(),
            DateArray:dateArray.reverse(),
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/edit', async (req, res) => {

    console.log(req.body);
    if(req.session.pass===req.body.ver_password){
        await db.query("update user_data set fname = $1 , lname = $2, date_of_birth=$3,email=$4",[req.body.fname,req.body.lname,req.body.DOB,req.body.mail]);
    }
    else{
        alert("Please Enter correct password");
    }
    const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
    const userData = await db.query("select fname, lname, date_of_birth,email from user_data where password=$1", [req.session.pass]);
    if (!result.rows[0].image) {
        res.render('profile.ejs', {
            Name: req.session.name,
            Gender: req.session.gender,
            First:userData.rows[0].fname,
            Last: userData.rows[0].lname,
            DOB: userData.rows[0].date_of_birth,
            mail: userData.rows[0].email,
        });
    } else {
        console.log(userData.rows[0].fname)
        const imageData = result.rows[0].image;
        const buffer = Buffer.from(imageData, "binary");
        const dataURI = buffer.toString();
        res.render("profile.ejs", {
            Name: req.session.name,
            Gender: req.session.gender,
            ImageData: dataURI,
            First:userData.rows[0].fname,
            Last: userData.rows[0].lname,
            DOB: userData.rows[0].date_of_birth,
            mail: userData.rows[0].email,
        });
    }

});

app.post('/upload', upload.single('profile_image'), async (req, res) => {
    try {

        const { originalname, mimetype, buffer } = req.file;
        await db.query('update user_data set  image = $1 where password= $2', [req.file.filename, req.session.pass]);
        const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
    const userData = await db.query("select fname, lname, date_of_birth,email from user_data where password=$1", [req.session.pass]);
    if (!result.rows[0].image) {
        res.render('profile.ejs', {
            Name: req.session.name,
            Gender: req.session.gender,
            First:userData.rows[0].fname,
            Last: userData.rows[0].lname,
            DOB: userData.rows[0].date_of_birth,
            mail: userData.rows[0].email,
        });
    } else {
        console.log(userData.rows[0].fname)
        const imageData = result.rows[0].image;
        const buffer = Buffer.from(imageData, "binary");
        const dataURI = buffer.toString();
        res.render("profile.ejs", {
            Name: req.session.name,
            Gender: req.session.gender,
            ImageData: dataURI,
            First:userData.rows[0].fname,
            Last: userData.rows[0].lname,
            DOB: userData.rows[0].date_of_birth,
            mail: userData.rows[0].email,
        });
    }
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).send('Error uploading image.');
    }
});

app.get('/profile', async (req, res) => {
    const pass = req.session.pass;
    const firstname = await db.query(
        "SELECT fname FROM user_data WHERE  password = $1", [pass]
    );
    const gen = await db.query(
        "SELECT gender FROM user_data WHERE password = $1", [pass]
    );
    const lastname = await db.query(
        "SELECT lname FROM user_data WHERE password = $1", [pass]
    );
    if (firstname.rows.length > 0 && lastname.rows.length > 0) {
        const name = firstname.rows[0].fname + " " + lastname.rows[0].lname;
        const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
        const userData = await db.query("select fname, lname, date_of_birth,email from user_data where password=$1", [req.session.pass]);
        if (!result.rows[0].image) {
            // No image found for the user
            res.render('profile.ejs', {
                Name: req.session.name,
                Gender: req.session.gender,
                First:userData.rows[0].fname,
                Last: userData.rows[0].lname,
                DOB: userData.rows[0].date_of_birth,
                mail: userData.rows[0].email,
            });
        } else {
            console.log(userData.rows[0].fname)
            const imageData = result.rows[0].image;
            const buffer = Buffer.from(imageData, "binary");
            const dataURI = buffer.toString();
            res.render("profile.ejs", {
                Name: name,
                Gender: (gen.rows[0].gender),
                ImageData: dataURI,
                First:userData.rows[0].fname,
                Last: userData.rows[0].lname,
                DOB: userData.rows[0].date_of_birth,
                mail: userData.rows[0].email,
            });
        }

    }
});

app.get("/dash", async (req, res) => {
    const amount = await db.query(`SELECT total_bal FROM user_data WHERE password = $1`, [req.session.pass]);

    const amounts = await db.query(`SELECT amount FROM ${req.session.table + 'Transaction'}`);
    const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${req.session.table+'transaction'}`);

        const categoryArray = [];
        const amountArray = [];
        const benArray = [];
        const dateArray = [];

        TransactionData.rows.forEach(row => {
            categoryArray.push(row.category);
            amountArray.push(row.amount);
            benArray.push(row.benpayname);
            dateArray.push(row.transaction_date);
        });
    const arr = []
    if (categoryArray.length < 7) {
        for (let i = categoryArray.length - 1; i >= 0; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    } else {
        for (let i = categoryArray.length - 1; i > categoryArray.length - 8; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    }

    const IncomeData = await db.query(`SELECT payee,transaction_date,amount FROM ${req.session.table + 'income'}`);
    const pay = [];
    const tran = [];
    const am = [];

    IncomeData.rows.forEach(row => {
        pay.push(row.payee);
        tran.push(row.transaction_date);
        am.push(row.amount);
    });

    const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
    const card = [];
    const bnk = [];
    const ex_month = [];
    const ex_year = [];

    CardData.rows.forEach(row => {
        card.push(row.card_number);
        bnk.push(row.bank);
        ex_month.push(row.expiry_month);
        ex_year.push(row.expiry_year);

    });

    const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
    const benf = [];
    const trans = [];
    const ru = [];

    billpayData.rows.forEach(row => {
        benf.push(row.ben_name);
        trans.push(row.transaction_date);
        ru.push(row.amount);
    });

    const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
    if(!result.rows[0].image){
        res.render('dash.ejs', {
            Name: req.session.name,
            Gender: req.session.gender,
            Bal: amount.rows[0].total_bal,
            amountsArray: arr,
            trans: tran,
            amnt: am,
            payees: pay,
            card_details: card,
            Bank: bnk,
            Expiry_mon: ex_month,
            Expiry_year: ex_year,
            benf_name: benf,
            transac: trans,
            Amount: ru,
            BenArray:benArray.reverse(),
            DateArray:dateArray.reverse()
        });
    }else{
    const imageData = result.rows[0].image;
    const buffer = Buffer.from(imageData, "binary");
    const dataURI = buffer.toString();

    res.render('dash.ejs', {
        Name: req.session.name,
        Gender: req.session.gender,
        Bal: amount.rows[0].total_bal,
        amountsArray: arr,
        trans: tran,
        amnt: am,
        payees: pay,
        card_details: card,
        Bank: bnk,
        Expiry_mon: ex_month,
        Expiry_year: ex_year,
        benf_name: benf,
        transac: trans,
        Amount: ru,
        ImageData: dataURI,
        BenArray: benArray,
        DateArray:dateArray
    });
}
});

app.get("/track", async (req, res) => {
    const amount = await db.query(`SELECT total_bal FROM user_data WHERE password = $1`, [req.session.pass]);

    const TransactionData = await db.query(`SELECT amount,benpayname,transaction_date,category FROM ${req.session.table+'transaction'}`);

        const categoryArray = [];
        const amountArray = [];
        const benArray = [];
        const dateArray = [];

        TransactionData.rows.forEach(row => {
            categoryArray.push(row.category);
            amountArray.push(row.amount);
            benArray.push(row.benpayname);
            dateArray.push(row.transaction_date);
        });
    
    const arr = []
    if (categoryArray.length < 7) {
        for (let i = categoryArray.length - 1; i >= 0; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    } else {
        for (let i = categoryArray.length - 1; i >= 0; i--) {
            if (categoryArray[i].toLowerCase() === 'received') {
                arr.push(+amountArray[i]);
            } else if (categoryArray[i].toLowerCase() === 'paid') {
                arr.push(-amountArray[i]);
            }
        }
    }

    const IncomeData = await db.query(`SELECT payee,transaction_date,amount FROM ${req.session.table + 'income'}`);
    const pay = [];
    const tran = [];
    const am = [];

    IncomeData.rows.forEach(row => {
        pay.push(row.payee);
        tran.push(row.transaction_date);
        am.push(row.amount);
    });

    const CardData = await db.query(`select card_number, bank, expiry_month, expiry_year from ${req.session.table + 'cards'}`);
    const card = [];
    const bnk = [];
    const ex_month = [];
    const ex_year = [];

    CardData.rows.forEach(row => {
        card.push(row.card_number);
        bnk.push(row.bank);
        ex_month.push(row.expiry_month);
        ex_year.push(row.expiry_year);

    });

    const billpayData = await db.query(`select ben_name,  transaction_date, amount from ${req.session.table + 'billpay'}`);
    const benf = [];
    const trans = [];
    const ru = [];

    billpayData.rows.forEach(row => {
        benf.push(row.ben_name);
        trans.push(row.transaction_date);
        ru.push(row.amount);
    });
    const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
            
    if(!result.rows[0].image){
        res.render('track.ejs', {
            Name: req.session.name,
        Gender: req.session.gender,
        Bal: amount.rows[0].total_bal,
        amountsArray: arr,
        trans: tran,
        amnt: am,
        payees: pay,
        card_details: card,
        Bank: bnk,
        Expiry_mon: ex_month,
        Expiry_year: ex_year,
        benf_name: benf,
        transac: trans,
        Amount: ru,
        BenArray:benArray,
        DateArray:dateArray,
        });
    }else{

    const imageData = result.rows[0].image;
    const buffer = Buffer.from(imageData, "binary");
    const dataURI = buffer.toString();
    res.render('track.ejs', {
        Name: req.session.name,
        Gender: req.session.gender,
        Bal: amount.rows[0].total_bal,
        amountsArray: arr,
        trans: tran,
        amnt: am,
        payees: pay,
        card_details: card,
        Bank: bnk,
        Expiry_mon: ex_month,
        Expiry_year: ex_year,
        benf_name: benf,
        transac: trans,
        Amount: ru,
        ImageData: dataURI,
        BenArray:benArray.reverse(),
        DateArray:dateArray.reverse(),

    });
}

   
});

io.on('connection', (socket) => {
    socket.on("user-message", (message) => {
        io.emit("message",message);
    })
});

app.get('/chat', async (req,res) => {

    const result = await db.query('SELECT image FROM user_data WHERE password = $1', [req.session.pass]);
        const userData = await db.query("select fname, lname, date_of_birth,email from user_data where password=$1", [req.session.pass]);
        if (!result.rows[0].image) {
            // No image found for the user
            res.render('chat.ejs', {
                Name: req.session.name,
                Gender: req.session.gender,
                First:userData.rows[0].fname,
                Last: userData.rows[0].lname,
                DOB: userData.rows[0].date_of_birth,
                mail: userData.rows[0].email,
            });
        } else {
            const imageData = result.rows[0].image;
            const buffer = Buffer.from(imageData, "binary");
            const dataURI = buffer.toString();
            res.render("chat", {
                Name: req.session.name,
                Gender: req.session.gender,
                ImageData: dataURI,
                First:userData.rows[0].fname,
                Last: userData.rows[0].lname,
                DOB: userData.rows[0].date_of_birth,
                mail: userData.rows[0].email,
            });
        }
});
app.get('/', (req, res) => {
    res.render('index.ejs');
});

server.listen(process.env.PORT,()=>{
    console.log("Server Server started on 3000");
});