var db=require('../config/connection')
var collection=require('../config/collections');
const bcrypt = require('bcrypt');

var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('path');
const { reject } = require('bcrypt/promises');
const moment = require('moment');

var instance = new Razorpay({
  key_id: 'rzp_test_SRAXdAoxDlvrIV',
  key_secret: 'OnapVyCnNWD1ocfkr4acWlp8',
});

module.exports = {
     doSignup:(userData)=>{
         return new Promise(async(resolve,reject)=>{
            userData.Password=await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                userData._id=data.insertedId;
                resolve(userData)
            })
         })
      
     },
     doLogin:(userData)=>{
         return new Promise(async(resolve,reject)=>{
             let loginStatus=false
             let response={}
             let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
             if(user){
                 bcrypt.compare(userData.Password,user.Password).then((status)=>{
                     if(status){
                         console.log("Login Success");
                         response.user=user
                         response.status=true
                         resolve(response)
                     }else{
                         console.log("Login failed");
                         resolve({status:false})
                     }
                 })
             }else{
                 console.log("Login failed");
                 resolve({status:false})
             }
         })
     },
     getUserDetails:(userPhone)=>{
        return new Promise(async(resolve,reject)=>{
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({Number:userPhone})
            resolve(user)
        })
     },
     addToCart:(proId,userId)=>{
         let proObj = {
             item:objectId(proId),
             quantity:1
         }
         return new Promise(async(resolve,reject)=>{
             let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
             if(userCart){
                 let proExist = userCart.products.findIndex(product=> product.item==proId)
                 console.log(proExist);
                 if(proExist!=-1){
                     db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
                     {
                         $inc:{'products.$.quantity':1}
                     }
                     ).then(()=>{
                         resolve()
                     })
                 }else{
                 db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId)},
                 {
                     
                         $push:{products:proObj}

                 }).then((response)=>{
                     resolve()
                 })
                }
             }else{
                 let cartObj = {
                     user:objectId(userId),
                     products:[proObj]
                 }
                 db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                     resolve()
                 })
             }
         })
     },
     getCartProducts:(userId)=>{
         return new Promise(async(resolve,reject)=>{
             let cartItems =await db.get().collection(collection.CART_COLLECTION).aggregate([
                 {
                     $match:{user:objectId(userId)}
                 },
                 {
                     $unwind:'$products'
                 },
                 {
                     $project:{
                         item:'$products.item',
                         quantity:'$products.quantity'
                     }
                 },
                 {
                     $lookup:{
                         from:collection.PRODUCT_COLLECTION,
                         localField:'item',
                         foreignField:'_id',
                         as:'product'
                     }
                 },
                 {
                     $project:{
                         item:1,quantity:1,
                         product:{$arrayElemAt:['$product',0]}
                     }
                 }
                 
             ]).toArray()
             
             resolve(cartItems)
         })
     },
     getCartCount:(userId)=>{
         return new Promise(async(resolve,reject)=>{
             let count=0
             let cart =await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
             if(cart){
                count=cart.products.length
             }
             resolve(count)
         })
     },
     changeProductQuantity:(details)=>{
         details.count=parseInt(details.count)
         details.quantity=parseInt(details.quantity)
         return new Promise((resolve,reject)=>{
             if(details.count==-1 && details.quantity==1){
                 db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
                 {
                     $pull:{products:{item:objectId(details.product)}}
                 }                
                 ).then((response)=>{
                     resolve({removeProduct:true})
                 })
             }else{
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            {
                $inc:{'products.$.quantity':details.count}
            }
            ).then((response)=>{
                resolve({status:true})
            })
        }
         })
     },
     removeCartItem:(details)=>{
         return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
            {
                $pull:{products:{item:objectId(details.product)}}
            }                
            ).then((response)=>{
                resolve({removeItem:true})
            })
         })
     },
     getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total =await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,
                        product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity',{$toInt:'$product.Price'}]}}
                    }
                }
                
            ]).toArray()
            console.log(total[0].total);
            resolve(total[0].total)
        })
     },
     checkoutItems:(order,products,address,total)=>{
         return new Promise((resolve,reject)=>{
            console.log("addrs:",address);
             let dateIso = new Date()
             let date = moment(dateIso).format('MMMM Do YYYY')
             let status=order['payment-method']==='COD'?'placed':'pending'
             let orderObj={
                 deliveryDetails:{
                     name:address[0].address.name,
                     number:address[0].address.number,
                     street:address[0].address.street,
                     town:address[0].address.town,
                     pincode:address[0].address.pincode,
                     city:address[0].address.city,
                     state:address[0].address.state  
                 },
                 userId:objectId(order.user),
                 paymentMethod:order['payment-method'],
                 products:products,
                 totalAmount:total,
                 status:status,
                 date:date
             }
             console.log("orderobj:",orderObj);
             db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                 db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.user)})
                 resolve(response.insertedId)
             })
         })
     },
     getCartProductList:(userId)=>{
         return new Promise(async(resolve,reject)=>{
             let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
             resolve(cart.products)
         })
     },
    getUserOrders:(userId)=>{
         return new Promise(async(resolve,reject)=>{
             let orders=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{userId:objectId(userId)}
                },
                {
                    $unwind:"$products"
                },
                {
                    $project:{
                        item: "$products.item",
                        quantity: "$products.quantity",
                        totalAmount: "$totalAmount",
                        status: "$status",
                        date: "$date",
                        paymentMethod: "$paymentMethod",
                        deliveryDetails: "$deliveryDetails"
                      }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:"item",
                        foreignField:"_id",
                        as:"products"
                    }
                },
                {
                    $project:{item:1,
                        quantity:1,
                        totalAmount:1,
                        status:1,
                        date:1,
                        deliveryDetails:1,
                        paymentMethod:1,
                        product:{$arrayElemAt:["$products",0] }
                    }
                },
                {
                    $sort:{date:-1}
                }
             ]).toArray()
             resolve(orders)
         })
     },
    /**  getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log("id:",orderId);
            let orderItems =await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,
                        product:{$arrayElemAt:['$product',0]}
                    }
                } 
            ]).toArray()
            console.log(orderItems);
            resolve(orderItems)
        })
     }, **/

     generateRazorpay:(orderId,total)=>{
         return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                  if(err){
                      console.log(err);
                  }else{
                console.log("New order:",order);
                resolve(order)
                  }
              });
         })
     },
     verifyPayment:(details)=>{
         return new Promise((resolve,reject)=>{
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256','OnapVyCnNWD1ocfkr4acWlp8')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
         })
     },
     changePaymentStatus:(orderId)=>{
         return new Promise((resolve,reject)=>{
             db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
             {
                 $set:{
                     status:'placed'
                 }
             }
             ).then(()=>{
                 resolve()
             })
         })
     },
     getMenProducts:()=>{
         return new Promise(async(resolve,reject)=>{
             let men = await db.get().collection(collection.PRODUCT_COLLECTION).find({mainCategory:"Men"}).sort({_id:-1}).toArray()
             resolve(men)
         })
     },

     getWomenProducts:()=>{
         return new Promise(async(resolve,reject)=>{
             let women = await db.get().collection(collection.PRODUCT_COLLECTION).find({mainCategory:"Women"}).sort({_id:-1}).toArray()
             resolve(women)
         })
     },
     getKidsProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let kids = await db.get().collection(collection.PRODUCT_COLLECTION).find({mainCategory:"Kids"}).sort({_id:-1}).toArray()
            resolve(kids)
        })
    },
    getSingleProduct:(proId)=>{
        return new Promise(async(resolve,reject)=>{
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)})
            resolve(product)
        })
    },
    getSimilarProducts:(proId)=>{
        return new Promise(async(resolve,reject)=>{
            let Products = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)})
            let catPro = Products.subCategory
            let categoryPdts = await db.get().collection(collection.PRODUCT_COLLECTION).find({subCategory:catPro}).toArray()
            resolve(categoryPdts)
        })
    },
    addToWishlist:(proId,userId)=>{
        let proObj = {
            item:objectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userWishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({user:objectId(userId)})
            if(userWishlist){
                let proExist = userWishlist.products.findIndex(product=> product.item==proId)
                console.log(proExist);
                if(proExist!=-1){
                    db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
                db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
                {
                    
                        $push:{products:proObj}

                }).then((response)=>{
                    resolve()
                })
               }
            }else{
                let wishlistObj = {
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.WISHLIST_COLLECTION).insertOne(wishlistObj).then((response)=>{
                    resolve()
                })
            }
        })
    },
    getWishlistProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let wishlistItems =await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,
                        product:{$arrayElemAt:['$product',0]}
                    }
                }
                
            ]).toArray()
            
            resolve(wishlistItems)
        })
    },
    getWishlistCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let wishlist =await db.get().collection(collection.WISHLIST_COLLECTION).findOne({user:objectId(userId)})
            if(wishlist){
               count=wishlist.products.length
            }
            resolve(count)
        })
    },
    addToCartfromWishlist:(proId,userId)=>{
        let proObj = {
            item:objectId(proId), 
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(userCart){
                let proExist = userCart.products.findIndex(product=> product.item==proId)
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
                     {
                         $inc:{'products.$.quantity':1}
                     }
                     ).then(()=>{
                        db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
                        {
                            $pull:{products:{item:objectId(proId)}}
                        }
                        )
                        resolve()
                     })
                }else{
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId)},
                    {
                        
                            $push:{products:proObj}
   
                    }).then(()=>{
                        db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
                        {
                            $pull:{products:{item:objectId(proId)}}
                        }
                        )
                        resolve({status:true})
                    })
                }
            }else{
                let cartObj = {
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    db.get().collection(collection.WISHLIST_COLLECTION).updateOne({user:objectId(userId)},
                    {
                        $pull:{products:{item:objectId(proId)}}
                    }
                    )
                    resolve({status:true})
                })
            }
        })
    },

    removeWishlistItem:(details)=>{
        return new Promise((resolve,reject)=>{
           db.get().collection(collection.WISHLIST_COLLECTION).updateOne({_id:objectId(details.wishlist)},
           {
               $pull:{products:{item:objectId(details.product)}}
           }                
           ).then((response)=>{
               resolve({removeItem:true})
           })
        })
    },
    getUserProfile:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let userProfile = await db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId(userId)})
            resolve(userProfile)
        })
    },
    addNewAddress:(userId,address)=>{
        address.id = new objectId()
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},
            {
                $addToSet:{
                    address:address
                }
            }
            ).then(()=>{
                resolve()
            })
        })
    },
    getAddresses:(userId)=>{
        //console.log('id:'+userId);
        return new Promise(async(resolve,reject)=>{
            let allAddress = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(userId)}
                },
                {
                    $unwind:'$address'
                },
                {
                    $project:{address:1,_id:0}
                }
                
            ]).toArray()
            resolve(allAddress)
            console.log('addr:'+allAddress);
        })
    },
    getSingleAddress:(userId,addressId)=>{
        return new Promise(async(resolve,reject)=>{
            let singleAddress = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    
                    $match:{_id:objectId(userId)}
                },
                {
                    $unwind:'$address'
                },
                {
                    $match:{"address.id":objectId(addressId)}
                },
                {
                    $project:{address:1}
                }
            ]).toArray()
            //console.log("single:"+singleAddress);
            resolve(singleAddress)
        })
    },
    deleteAddress:(userId,addressId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},
            {
                $pull:{address:{id:objectId(addressId)}}
            }
            ).then(()=>{
                resolve()
            })
        })
    }
}