var db=require('../config/connection')
var collection=require('../config/collections');
var objectId = require('mongodb').ObjectId
module.exports={

    addProduct:(product,callback)=>{
        console.log(product);
        db.get().collection('product').insertOne(product).then((data)=>{
            
            callback(data.insertedId)
        })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().sort({_id:1}).toArray()
            resolve(products)
        })
    },
    deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(proId)}).then((response)=>{
                //console.log(response);
                resolve(response)
            })
        })
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(proId,proDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(proId)},{
                $set:{
                    Name:proDetails.Name,
                    Categoty:proDetails.Categoty,
                    Price:proDetails.Price
                }
            }).then((response)=>{
                resolve()
            })
        })
    },
    getSpecificProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let specificProducts = await db.get().collection(collection.PRODUCT_COLLECTION).find({subCategory:"Sneakers"}).sort({_id:-1}).limit(4).toArray()
            resolve(specificProducts)
        })
    },
    addCategory:(details)=>{
        return new Promise(async(resolve,reject)=>{
            let categoryDetails = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({category:details.Catname})
            if(categoryDetails){
                await db.get().collection(collection.CATEGORY_COLLECTION).updateOne({category:details.Catname},
                    {
                        $push:{subCategory:details.Subname}
                    }
                    )
                    resolve()
            }else{
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne({category:details.Catname,subCategory:[details.Subname]}).then((response)=>{
                    resolve(response)
                })
            }
        })
    },
    getCategories:()=>{
        return new Promise(async(resolve,reject)=>{
            let categories =await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(categories)
        })
    },
    getUsers:()=>{
        return new Promise(async(resolve,reject)=>{
            let allUsers = await db.get().collection(collection.USER_COLLECTION).find({}).toArray()
            resolve(allUsers)
        })
    },
    blockUser:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{$set:{status:false}}).then((response)=>{
                resolve(response)
            })
        })
    },
    unblockUser:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{$set:{status:true}}).then((response)=>{
                resolve(response)
            })
        })
    },
    getBlockedUsers:()=>{
        return new Promise(async(resolve,reject)=>{
            let blockedUsers = await db.get().collection(collection.USER_COLLECTION).find({status:false}).toArray()
            resolve(blockedUsers)
        })
    },
    getAllOrders:()=>{
        return new Promise(async(resolve,reject)=>{
            let allOrders = await db.get().collection(collection.ORDER_COLLECTION).find().sort({_id:-1}).toArray()
            resolve(allOrders)
        })
    },
    changeStatus:(orderId,status)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},{$set:{status:status}}).then(()=>{
                resolve()
            })
        })
    },
    
    getUserCount:()=>{
        return new Promise(async(resolve,reject)=>{
            let userCount = await db.get().collection(collection.USER_COLLECTION).count()
            resolve(userCount)
        })
    },
    getOrderCount:()=>{
        return new Promise(async(resolve,reject)=>{
            let orderCount = await db.get().collection(collection.ORDER_COLLECTION).count()
            resolve(orderCount)
        })
    },
    getProductsCount:()=>{
        return new Promise(async(resolve,reject)=>{
            let productCount = await db.get().collection(collection.PRODUCT_COLLECTION).count()
            resolve(productCount)
        })
    },
    getTotalRevenue:()=>{
        return new Promise(async(resolve,reject)=>{
            let totalRevenue = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{"status":"delivered"}
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:"$totalAmount"}
                    }
                }
            ]).toArray()
            console.log("total:",totalRevenue[0].total);
            resolve(totalRevenue[0].total)
        })
    },
    paymentMethods:()=>{
        let methods = []
        return new Promise(async(resolve,reject)=>{
            let cod = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{paymentMethod:'COD'}
                }
            ]).toArray()
            let codLength = cod.length
            methods.push(codLength)

            let razorpay = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{paymentMethod:'Razorpay'}
                }
            ]).toArray()
            let razorpayLength = razorpay.length
            methods.push(razorpayLength)

            resolve(methods)
        })
    },

    getTotalStatus:()=>{
        return new Promise(async(resolve,reject)=>{
          let Pstatus=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
           { $match: {status:'placed'} },
           { $project :{
             count: {$size:{ "$ifNull":["$products",[]]}}
           }},
           {$group : {
             _id:"", total:{$sum:"$count"}
           }},
           { $set :{ status:'placed'}},
          ]).toArray()
    
          let Sstatus=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            { $match: {status:'shipped'} },
           { $project :{
             count: {$size:{ "$ifNull":["$products",[]]}}
           }},
           {$group : {
             _id:"", total:{$sum:"$count"}
           }},
           { $set :{ status:'shipped'}},
           ]).toArray()
    
           let Dstatus=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            { $match: {status:'delivered'} },
           { $project :{
             count: {$size:{ "$ifNull":["$products",[]]}}
           }},
           {$group : {
             _id:"", total:{$sum:"$count"}
           }},
           { $set :{ status:'delivered'}},
           ]).toArray()
    
    
           let Cstatus=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            { $match: {status:'cancelled'} },
            { $project :{
              count: {$size:{ "$ifNull":["$products",[]]}}
            }},
            {$group : {
              _id:"", total:{$sum:"$count"}
            }},
            { $set :{ status:'cancelled'}},
           ]).toArray()
           resolve([Pstatus[0],Sstatus[0],Dstatus[0],Cstatus[0]])
        })
      },
      recentUserlist:()=>{
        return new Promise(async(resolve,reject)=>{
            let userList = await db.get().collection(collection.USER_COLLECTION).find().sort({_id:-1}).toArray()
            resolve(userList)
        })
      },

      productOffer:(details)=>{
        return new Promise(async(resolve,reject)=>{
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({Name:details.Name})
            details.percentage=parseInt(details.percentage)
            let actualPrice = product.Price
            let newPrice = (((product.Price)*(details.percentage))/100)
            newPrice = newPrice.toFixed()
            console.log("new:"+newPrice);
            db.get().collection(collection.OFFER_COLLECTION).insertOne(details).then((response)=>{
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({Name:details.Name},
                    {
                        $set:{
                            pdtOffer:true,
                            percentage:details.percentage,
                            Price:(actualPrice-newPrice),
                            actualPrice:actualPrice
                        }
                    }
                    ).then((response)=>{
                        resolve()
                    })
            })
        })
      },

      getProductOffer:()=>{
        return new Promise(async(resolve,reject)=>{
            let pdtOffer = await db.get().collection(collection.OFFER_COLLECTION).find().toArray()
            resolve(pdtOffer)
        })
      }
    
}