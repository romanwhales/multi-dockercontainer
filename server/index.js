const keys = require('./keys');

//Express App SetUp
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(bodyParser.json());


//Postgres Client Set Up
const {Pool} = require('pg');
const pgClient = new Pool({
    user:keys.pgUser,
    host:keys.pgHost,
    database:keys.pgDatabase,
    password:keys.pgPassword,
    port:keys.pgPort
});

pgClient.on('error',()=>console.log('Lost PG Connection'));

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch(err => console.log(err));

//Redis Client SetUp
const redis = require('redis');
const redisClient = redis.createClient({
    host:keys.redisHost,
    port:keys.redisPort,
    retry_strategy:()=>1000
});

const redisPublisher = redisClient.duplicate();

redisClient.on('error', function (er) {
    console.trace('Here I am'); 
    console.error(er.stack); 
  });

//Express route handlers
app.get('/',(req,res)=>{
    res.send('Hi');
});

app.get('/values/all', async(req,res) => {
    const values = await pgClient.query('select * from values');
    res.send(values.rows);
});

app.get('/values/current', (req,res) => {
    // console.log('Redis client ',redisClient);

    redisClient.hgetall('values',(err,values)=>{
    
        res.send(values);
    })
    
});

app.get('/redis-test',(req,res) =>{
    console.log('Hello!!!');
    console.log('client connected redis ',redisClient.connected);
    redisClient.set('visits',0);
    res.send({success:redisClient.connected});
})

app.get('/redis-result',(req,res) =>{
    console.log('Here');
    // redisClient.set('visits',0);
    console.log('--------------'+redisClient.get('visits'));
    redisClient.get('visits',(err,visits)=>{
        res.send('Number of visits is'+visits);
        // client.set('visits',parseInt(visits)+1);
    })
})



app.post('/values',async(req,res) => {
    const index = req.body.index;
    if(parseInt(index) > 40){
        return res.status(422).send('Index too high');
    }

    redisClient.hset('values',index);
    redisPublisher.publish('insert',index);
    pgClient.query('INSERT INTO values(number) VALUES($1)',[index]);
    res.send({working:true});
});

app.listen(5000,err => {
    console.log('client connected redis ',redisClient.connected);
    console.log('Listening');
})




