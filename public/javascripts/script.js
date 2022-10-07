
function addToCart(proId){
    $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        success:(response)=>{
           alertify.set('notifier','position', 'top-center')
            alertify.notify('Added to Cart', 'success', 2, function(){console.log('dismissed');});
            if(response.status){
                let count=$('#cart-count').html()
                count=parseInt(count)+1
                $('#cart-count').html(count)
            }
        }
    })
}

function addToWishlist(proId){
    $.ajax({
        url:'/add-to-wishlist/'+proId,
        method:'get',
        success:(response)=>{
            alertify.set('notifier','position', 'bottom-center')
            alertify.notify('Added to your wishlist', 'custom', 2, function(){console.log('dismissed');})
            if(response.status){
                let count=$('#wishlist-count').html()
                count=parseInt(count)+1
                $('#wishlist-count').html(count)
            }
        }
    })
}

function addToCartfromWishlist(proId){
    $.ajax({
        url:'/add-to-cart-fromWishlist/'+proId,
        method:'get',
        success:(response)=>{
            alertify.set('notifier','position', 'top-center')
            alertify.notify('Added to Cart', 'success', 2, function(){console.log('dismissed');});
            if(response.status){
                let count=$('#cart-count').html()
                count=parseInt(count)+1
                $('#cart-count').html(count)
                location.reload()
            } 
        }
    })
}

function myFunction() {
    var element = document.getElementById("section-A");
    element.classList.toggle("d-block");
 }

 function addressRemove(userId,addressId){
    $.ajax({
    url:'/remove-address?userId='+userId+'&addressId='+addressId,
    method:'post',
    success:(response)=>{
      location.reload()
    }
  })
}
