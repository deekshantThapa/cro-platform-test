const express = require("express");
const app = express();

require("dotenv").config();

const codeRoutes = require("./Routes/codeRoute");
const userRoutes = require("./Routes/userRoute");

const { connectAll } = require("./Connector/dbConnector");

const helmet = require("helmet");
const cors = require("cors");
const expressRateLimit = require("express-rate-limit");

app.set('trust proxy', 1);

app.use(expressRateLimit({
    windowMs:15*60*1000,
    max:100
}));

app.use(express.json());
app.use(helmet());
app.use(cors());

app.use("/api/V1/user",userRoutes);
app.use("/api/V1/code",codeRoutes);

const start=async()=>{
    const port=process.env.API_PORT||5000;
    try{
        await connectAll();
        app.listen(port,()=>console.log(`API is listening to port ${port}`));
    }
    catch(err){
        console.log(err);
        process.exit(1);
    }
}
start();