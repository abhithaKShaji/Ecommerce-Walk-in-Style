const { response } = require('express');
var express = require('express');
const session = require('express-session');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')

const verifyLogin=(req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const serviceSid = process.env.TWILIO_SERVICE_SID
const client = require('twilio')(accountSid, authToken)


/* GET home page. */
router.get('/',async function(req, res, next) {
  let specificProducts = await productHelpers.getSpecificProducts()
  let user = req.session.user
  let cartCount=null
  if(req.session.user){
  cartCount =await userHelpers.getCartCount(req.session.user._id) 
  }
  productHelpers.getAllProducts().then((products)=>{
    //console.log(products);
   res.render('user/home',{products,user,cartCount,specificProducts,footer:true})
  })
});

router.get('/view-product/:id',async(req,res)=>{
  let user = req.session.user
  let cartCount = null
  if(req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let similarProducts = await userHelpers.getSimilarProducts(req.params.id)
    userHelpers.getSingleProduct(req.params.id).then((product)=>{
      res.render('user/view-product',{user,product,cartCount,similarProducts,footer:true}) 
    })
   
})

router.get('/men',(req,res)=>{
  userHelpers.getMenProducts().then((men)=>{
    res.render('user/men',{men,footer:true})
  })
})

router.get('/women',(req,res)=>{
  userHelpers.getWomenProducts().then((women)=>{
    res.render('user/women',{women,footer:true})
  })
})

router.get('/kids',(req,res)=>{
  userHelpers.getKidsProducts().then((kids)=>{
    res.render('user/kids',{kids,footer:true})
  })
})



router.get('/login',(req,res)=>{
  console.log(req.session.user);
  if(req.session.user){
   
    res.redirect('/')
  }else{
  res.render('user/login',{"loginErr":req.session.userLoginErr})
  req.session.userLoginErr=false
}
})

router.get('/signup',(req,res)=>{
  res.render('user/signup')
})

router.post('/signup',(req,res)=>{
  req.session.doSignup = req.body
  let num=req.body.Number
  let Number=`+91${num}`
  userHelpers.getUserDetails(Number).then((user)=>{
    if(user){
      req.session.userExist = true
      res.redirect('/signup')
    }else{
      client.verify.services(serviceSid).verifications.create({
        to: `+91${num}`,
        channel: "sms"
      }).then((response)=>{
        req.session.number = response.to
        res.redirect('/otp')
      }).catch((err)=>{
        console.log(err);
      })
    }
  })
 /** userHelpers.doSignup(req.body).then((response)=>{
    console.log(response);
    req.session.user=response
    req.session.userLoggedIn=true
    res.redirect('/')
  })**/
})

router.get('/otp',(req,res)=>{
  res.render('user/otp')
})

router.post('/otp',(req,res)=>{
  let otp = req.body.otp
  let number = req.session.number
  client.verify.services(serviceSid).verificationChecks.create({
    to:number,
    code:otp
  }).then(async(response)=>{
    if(response.valid){
      let signupData = req.session.doSignup
      userHelpers.doSignup(signupData).then(async()=>{
        let user = await userHelpers.getUserDetails(number)
        req.session.userLoggedIn=true
        req.session.user=user
        res.redirect('/')
      })
    }else{
      redirect('/otp')
    }
  })
})

router.get('/resendOtp',(req,res)=>{
  let number=req.session.number
  console.log("num",number);
  client.verify.services(serviceSid).verifications.create({
    to:`+91${number}`,
    channel:"sms"
  }).then((response)=>{
    req.session.user=response.user
    req.session.resend=true
    res.redirect('/otp')
  }).catch((err)=>{
    req.session.invalidOtp=true
    res.redirect('/signup')
  })
})

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
     if(response.status){
       req.session.user=response.user
       req.session.userLoggedIn=true
       res.redirect('/')
     }else{
       req.session.userLoginErr="Invalid username or password"
       res.redirect('/login')
     }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userLoggedIn=false
  res.redirect('/')
})

router.get('/wishlist',verifyLogin,async(req,res)=>{
  let products = await userHelpers.getWishlistProducts(req.session.user._id)
  if(products.length>0){
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    let wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
    res.render('user/wishlist',{products,user:req.session.user,wishlistCount,cartCount})
  }else{
    res.render('user/empty-wishlist',{user:req.session.user})
  }
  
})
router.get('/add-to-wishlist/:id',(req,res)=>{
  console.log('API call');
  userHelpers.addToWishlist(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})
router.get('/add-to-cart-fromWishlist/:id',(req,res)=>{
  userHelpers.addToCartfromWishlist(req.params.id,req.session.user._id).then((response)=>{
    res.json({status:true})
  })
})
router.post('/remove-wishlist-item',(req,res)=>{
  userHelpers.removeWishlistItem(req.body).then((response)=>{
      res.json(response)
  })
})
router.get('/empty-wishlist',async(req,res)=>{
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  res.render('user/empty-wishlist',{cartCount})
})

router.get('/cart',verifyLogin,async(req,res)=>{ 
  let products =await userHelpers.getCartProducts(req.session.user._id)
  let totalValue=0
  if(products.length>0){
  totalValue=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/cart',{products,user:req.session.user,totalValue})
  }else{
    res.render('user/empty-cart',{user:req.session.user})
  }
  
})
router.get('/add-to-cart/:id',(req,res)=>{
  console.log('API call');
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})
router.post('/change-product-quantity',(req,res,next)=>{   
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
   response.total=await userHelpers.getTotalAmount(req.body.user)
     res.json(response)
  })
})
router.post('/remove-cart-item',(req,res)=>{
  userHelpers.removeCartItem(req.body).then((response)=>{
      res.json(response)
  })
})
router.get('/empty-cart',(req,res)=>{
  res.render('user/empty-cart')
})

router.get('/profile',async(req,res)=>{
  let id = req.session.user._id;
  let userProfile = await userHelpers.getUserProfile(id)
  userHelpers.getAddresses(id).then((allAddress)=>{
  res.render('user/profile',{user:req.session.user,userProfile,allAddress})
  })
  
})
router.post('/remove-address',(req,res)=>{
  userHelpers.deleteAddress(req.query.userId,req.query.addressId).then(()=>{
      res.json({status:true})
  })
})
router.post('/add-address',(req,res)=>{
  let user = req.session.user._id 
  userHelpers.addNewAddress(user,req.body).then((response)=>{
    res.redirect('/profile')
  })
})

router.post('/add-checkout-address',(req,res)=>{
  let user = req.session.user._id
  userHelpers.addNewAddress(user,req.body).then((response)=>{
    res.redirect('/checkout')
  })
})

router.get('/checkout',verifyLogin,async(req,res)=>{
  let products =await userHelpers.getCartProducts(req.session.user._id)
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  userHelpers.getAddresses(req.session.user._id).then((allAddress)=>{
    res.render('user/checkout',{products,total,user:req.session.user,allAddress})
  })
  
})
router.post('/checkout',async(req,res)=>{
  let products=await userHelpers.getCartProductList(req.session.user._id)
  let totalPrice=await userHelpers.getTotalAmount(req.session.user._id)
  let singleAddress = await userHelpers.getSingleAddress(req.session.user._id,req.body.address)
  userHelpers.checkoutItems(req.body,products,singleAddress,totalPrice).then((orderId)=>{
    if(req.body['payment-method']==='COD'){
      res.json({codSuccess:true})
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)
      })
    }
    
  })
 //console.log(req.body);
})
router.get('/ordersuccess',(req,res)=>{
  res.render('user/ordersuccess',{user:req.session.user})
})
router.get('/myorders',(req,res)=>{
  let id = req.session.user._id
  userHelpers.getUserOrders(id).then((orders)=>{
    res.render('user/myorders',{user:req.session.user,orders})
  })
})
/**router.get('/view-order-products/:id',async(req,res)=>{
  let products=await userHelpers.getOrderProducts(req.params.id)
  console.log("pro",products);
  res.render('user/view-order-products',{user:req.session.user,products})
}) **/
router.post('/verify-payment',(req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
   userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
     console.log('Payment Successfull');
     res.json({status:true})
   })
  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errMsg:''})
  })
})

module.exports = router;
