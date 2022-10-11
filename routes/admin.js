var express = require('express');
const {render} = require('../app')
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')

/* GET users listing. */
router.get('/',async function(req, res, next) {
  let userCount = await productHelpers.getUserCount()
  let orderCount = await productHelpers.getOrderCount()
  let productCount = await productHelpers.getProductsCount()
  let totalRevenue = await productHelpers.getTotalRevenue()
  let paymentMethods = await productHelpers.paymentMethods()
  let orderStatus = await productHelpers.getTotalStatus()
  let userList = await productHelpers.recentUserlist()
  if(totalRevenue==undefined){
    totalRevenue=0
  }
   res.render('admin/dashboard',{admin:true,userCount,orderCount,productCount,totalRevenue,paymentMethods,orderStatus,userList})
   
 });

router.get('/view-products', function(req, res, next) {
 productHelpers.getAllProducts().then((products)=>{
   console.log(products);
  res.render('admin/view-products',{admin:true,products})
 })
  
});
router.get('/add-product',async(req,res)=>{
 let category = await productHelpers.getCategories()
// console.log(category);
 res.render('admin/add-product',{admin:true,category})
})
router.post('/add-product',(req,res)=>{
  console.log(req.body);
  console.log(req.files.image);

  productHelpers.addProduct(req.body,(id)=>{
    let image1=req.files.image1
    let image2=req.files.image2
    let image3=req.files.image3
    let image4=req.files.image4
    console.log(id);
    image1.mv('./public/product-images/'+id+'1.jpg')
    image2.mv('./public/product-images/'+id+'2.jpg')
    image3.mv('./public/product-images/'+id+'3.jpg')
    image4.mv('./public/product-images/'+id+'4.jpg')
    res.redirect('/admin/view-products')
  }).catch((err)=>{
    if(err){
      res.redirect('/admin/add-product')
    }
  })
})
router.get('/delete-product/:id',(req,res)=>{
    let proId = req.params.id
    console.log(proId);
    productHelpers.deleteProduct(proId).then((response)=>{
      res.redirect('/admin')
    })
})
router.get('/edit-product/:id',async (req,res)=>{
  let product = await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product',{product,admin:true})
})
router.post('/edit-product/:id',(req,res)=>{
  let id=req.params.id
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image){
      let image=req.files.image
      image.mv('./public/product-images/'+id+'.jpg')
    }
  })
})
router.get('/category',(req,res)=>{
  productHelpers.getCategories().then((categories)=>{
    res.render('admin/category',{admin:true,categories})
  })
})
router.get('/add-category',(req,res)=>{
  res.render('admin/add-category',{admin:true})
})
router.post('/add-category',(req,res)=>{
  productHelpers.addCategory(req.body).then((response)=>{
    res.redirect('/admin/category')
  })
  
})

router.get('/view-users',(req,res)=>{
  productHelpers.getUsers().then((allUsers)=>{
    res.render('admin/view-users',{admin:true,allUsers})
  })
})

router.get('/block-user/:id',(req,res)=>{
  productHelpers.blockUser(req.params.id).then((response)=>{
    res.redirect('/admin/view-users')
  })
})

router.get('/unblock-user/:id',(req,res)=>{
  productHelpers.unblockUser(req.params.id).then((response)=>{
   res.redirect('/admin/view-users')
  })
})

router.get('/blocked-users',(req,res)=>{
  productHelpers.getBlockedUsers().then((blockedUsers)=>{
    res.render('admin/blocked-users',{admin:true,blockedUsers})
  })
})

router.get('/allOrders',(req,res)=>{
  productHelpers.getAllOrders().then((allOrders)=>{
    res.render('admin/allOrders',{admin:true,allOrders})
  })
})

router.get('/placed/:id',(req,res)=>{
  let status = 'placed'
  productHelpers.changeStatus(req.params.id,status).then(()=>{
    res.redirect('/admin/allOrders')
  })
})

router.get('/shipped/:id',(req,res)=>{
  let status = 'shipped'
  productHelpers.changeStatus(req.params.id,status).then(()=>{
    res.redirect('/admin/allOrders')
  })
})

router.get('/delivered/:id',(req,res)=>{
  let status = 'delivered'
  productHelpers.changeStatus(req.params.id,status).then(()=>{
    res.redirect('/admin/allOrders')
  })
})

router.get('/cancelled/:id',(req,res)=>{
  let status = 'cancelled'
  productHelpers.changeStatus(req.params.id,status).then(()=>{
    res.redirect('/admin/allOrders')
  })
})


module.exports = router;
