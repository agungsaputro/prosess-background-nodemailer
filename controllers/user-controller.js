const {User} = require("../models");
const jwt = require('jsonwebtoken');
const express = require('express');

//nodemailer
const nodemailer = require("nodemailer");

//node-cron
const cron = require("node-cron");

//email-template
const html = require("../email/template_email");

const fs = require('fs');
const pdf = require('html-pdf');
const hmtlPdf = fs.readFileSync('./email/template.html', 'utf8');
const optionsPdf = {format: 'Letter'};

const passport = require('passport');
const passportJWT = require('passport-jwt');

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = 'wowwow';

// lets create our strategy for web token
let strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  console.log('payload received', jwt_payload);
  let user = getUser({ id: jwt_payload.id });

  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
});
// use the strategy
passport.use(strategy);

const app = express();
// initialize passport with express
app.use(passport.initialize());

//pdf
pdf.create(hmtlPdf, optionsPdf).toFile('./email/template.pdf', function(err, res){
    if(err) return console.log(err);
    console.log(res);
});

//mailer
const transporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
    user: "1165c4e810f68e",
    pass: "b5ae0cd6e997ff"
  }
})

const response = {
    status : true,
    message: "",
    data:[]
}

const getUser = async obj => {
    return await User.findOne({
      where: obj,
    });
  };

class UserController{
    static async getAllUser(req,res){
        const users = await User.findAll();
        response.data = users;
        response.status = "succes";
        res.json(response);
    }

    static async postUser(req,res){
        const {body} = req;

        try{
            const postUser = await User.create({
            name:body.name,
            password:body.password,
            email:body.email
            })
            console.log(postUser);
            response.message = "success"
            res.status(201).json(response);
        }catch(err){
            response.status = false;
            response.message = err.message;
            res.status(400).json(response);
        }
    }

    static async getUserId(req,res){
        const {id} = req.params;
        const users = await User.findByPk(id);
        try{
            if(!users) throw new Error("not found");
            response.status = "succes";
            response.data = users;
            res.json(response)
        }catch(err){
            response.message = err.message;
            response.status = "fail";
            response.data = [];
            res.status(404).json(response);
        }
    }

    static async postUserRegister(req,res){
        const {name, password, email} = req.body;

        try{
            const postUser = await User.create({
            name:name,
            password:password,
            email:email
            })
            console.log(postUser);
            response.message = "success"
            res.status(201).json(response);
        }catch(err){
            response.status = false;
            response.message = err.message;
            res.status(400).json(response);
        }

        cron.schedule("1 * * * * *", function(){
            console.log("---------------------");
            console.log("Running Cron Job");
            const mailOptions = {
              from: "COMPANYEMAIL@gmail.com",
              to: email,
              subject: "Register Complete",
              html : "<p>HTML version of the message</p>",
              attachments: [
                { // Use a URL as an attachment
                      filename: 'template.pdf',
                      path: './email/template.pdf',
                      contentType: 'application/pdf'
                  }
                ]
            };
            transporter.sendMail(mailOptions, function(error, info) {
              if (error) {
                throw error;
              } else {
                console.log("Email successfully sent!");
              }
            });
          });
        
    }

    static async postUserLogin(req,res){
        const { name, password, email } = req.body;

        if(email && password){
            let user = await getUser({email:email});
            if(!user){
                res.status(400).json({message: 'No such user found'});
            }
            if(user.password === password){
                let payload = {id: user.id};
                let token = jwt.sign(payload,jwtOptions.secretOrKey);
                res.json({msg: 'ok', token:token});
            }else{
                res.status(400).json({message: 'password is incorrect'});
            }
        }
    }

    static async protected (req,res){
        passport.authenticate('jwt', { session: false });
        res.json('Success! You can now see this without a token.');
    }
}

module.exports = UserController;