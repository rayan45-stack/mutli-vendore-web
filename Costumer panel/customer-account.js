(() => {
  const KEY = 'noireCustomerAccount_v1';
  const LEGACY_KEY = 'ryzanCustomerAccountDemo_v1';
  const ORDERS_KEY = 'noireCustomerOrders';
  const WISHLIST_KEY = 'noireCustomerWishlist';
  const FOLLOW_KEY = 'noireCustomerFollowedStores';
  const CART_KEY = 'noireCustomerCart';
  const SHIPPING_ADDRESS_KEY = 'noireCustomerShippingAddress';
  const ADDRESSES_KEY = 'noireCustomerSavedAddresses';
  const SHOPPING_CONTINUATION_KEY = 'noireSellerShoppingContinuation';
  const REQUEST_AUTO_DECISION_MS = 24 * 60 * 60 * 1000;
  let requestDecisionTimer = null;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  function readJson(key, fallback) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  }
  function load(){
    const saved = readJson(KEY, null) || readJson(LEGACY_KEY, null) || {};
    const profile = saved.profile && typeof saved.profile === 'object' ? saved.profile : {};
    const legacyAddresses = Array.isArray(saved.addresses)
      ? saved.addresses.filter(address => address && address.address !== 'Add your house, street and area here.')
      : [];
    const storedAddresses = readJson(ADDRESSES_KEY, legacyAddresses);
    const addresses = Array.isArray(storedAddresses) ? storedAddresses : legacyAddresses;
    const shippingAddress = readJson(SHIPPING_ADDRESS_KEY, null);
    if (shippingAddress && !addresses.some(address => address &&
      address.address === shippingAddress.address && address.phone === shippingAddress.phone
    )) {
      addresses.unshift({
        id: 'checkout-address',
        label: 'Checkout address',
        recipient: shippingAddress.name || profile.name || '',
        phone: shippingAddress.phone || '',
        city: shippingAddress.city || '',
        address: shippingAddress.address || ''
      });
    }
    const accountState = {
      profile: {
        name: profile.name === 'Rayan Customer' ? '' : profile.name || '',
        email: profile.email === 'customer@example.com' ? '' : profile.email || '',
        phone: profile.phone || '',
        dob: profile.dob || '',
        gender: profile.gender || 'Prefer not to say'
      },
      addresses,
      orders: [],
      reviews: [],
      wishlist: [],
      stores: []
    };
    if (localStorage.getItem(LEGACY_KEY) !== null) {
      localStorage.setItem(KEY, JSON.stringify({
        profile: accountState.profile,
        addresses: accountState.addresses
      }));
      localStorage.setItem(ADDRESSES_KEY, JSON.stringify(accountState.addresses));
      localStorage.removeItem(LEGACY_KEY);
    }
    return accountState;
  }
  let state = load();
  function save(){
    localStorage.setItem(KEY,JSON.stringify({
      profile: state.profile,
      addresses: state.addresses
    }));
    localStorage.setItem(ADDRESSES_KEY, JSON.stringify(state.addresses));
    localStorage.removeItem(LEGACY_KEY);
    renderAll();
  }
  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function money(n){return 'Rs. '+Number(n).toLocaleString('en-PK')}
  function dateFmt(s){if(!s)return'—';const value=String(s);const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value);return Number.isNaN(date.getTime())?'—':date.toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}
  function getSellerAccounts(){
    const accounts=readJson('noireSellerAccounts',[]);
    return Array.isArray(accounts)?accounts:[];
  }
  function getActiveSellerAccount(){
    const session=readJson('noireLoggedInSeller',null);
    if(!session||!session.email)return null;
    return getSellerAccounts().find(account=>
      account&&String(account.email||'').trim().toLowerCase()===String(session.email).trim().toLowerCase()
    )||session;
  }
  function syncSellerCustomerProfile(){
    const seller=getActiveSellerAccount();
    if(!seller)return;
    const name=String(seller.fullName||seller.name||'').trim();
    const email=String(seller.email||'').trim().toLowerCase();
    const phone=String(seller.phone||'').trim();
    if(!state.profile.name&&name)state.profile.name=name;
    if(!state.profile.email&&email)state.profile.email=email;
    if(!state.profile.phone&&phone)state.profile.phone=phone;
    if(name||email||phone){
      localStorage.setItem(KEY,JSON.stringify({profile:state.profile,addresses:state.addresses}));
    }
  }
  function getSellerProducts(email){
    const products=readJson('noireSellerProducts_'+String(email||'').trim().toLowerCase(),[]);
    return Array.isArray(products)?products.filter(product=>product&&typeof product==='object'):[];
  }
  function findProduct(email,id){
    return getSellerProducts(email).find(product=>product&&String(product.id)===String(id))||null;
  }
  function sellerName(email){
    const seller=getSellerAccounts().find(account=>account&&String(account.email||'').trim().toLowerCase()===String(email||'').trim().toLowerCase());
    return seller?.storeName||seller?.name||'NOIRÉ seller';
  }
  function isOwnSellerProduct(email){
    const productSellerEmail=String(email||'').trim().toLowerCase();
    if(!productSellerEmail)return false;
    const activeSeller=getActiveSellerAccount();
    if(activeSeller&&String(activeSeller.email||'').trim().toLowerCase()===productSellerEmail)return true;
    const profileEmail=String(state.profile.email||'').trim().toLowerCase();
    return profileEmail===productSellerEmail&&getSellerAccounts().some(account=>
      account&&String(account.email||'').trim().toLowerCase()===profileEmail
    );
  }
  function getReviewingIdentity(){
    const seller=getActiveSellerAccount();
    return {
      name:String(seller?.fullName||seller?.name||state.profile.name||'Customer').trim(),
      email:String(seller?.email||state.profile.email||'').trim().toLowerCase()
    };
  }
  function refreshWebsiteData(){
    const storedAddresses=readJson(ADDRESSES_KEY,state.addresses);
    if(Array.isArray(storedAddresses))state.addresses=storedAddresses.filter(address=>address&&typeof address==='object');
    const shippingAddress=readJson(SHIPPING_ADDRESS_KEY,null);
    if(shippingAddress&&shippingAddress.address){
      state.addresses=state.addresses.filter(address=>address.id!=='checkout-address');
      if(!state.addresses.some(address=>address.address===shippingAddress.address&&address.phone===shippingAddress.phone)){
        state.addresses.unshift({id:'checkout-address',label:'Checkout address',
          recipient:shippingAddress.name||state.profile.name||'',phone:shippingAddress.phone||'',
          city:shippingAddress.city||'',address:shippingAddress.address});
      }
    }
    const orders=readJson(ORDERS_KEY,[]);
    if(!Array.isArray(orders))throw new Error('Saved order data is invalid.');
    if(processAutomaticRequests(orders))localStorage.setItem(ORDERS_KEY,JSON.stringify(orders));
    scheduleAutomaticRequestDecision(orders);
    const followed=readJson(FOLLOW_KEY,[]);
    const wishlist=readJson(WISHLIST_KEY,[]);
    state.orders=(Array.isArray(orders)?orders:[]).filter(order=>order&&typeof order==='object').map(order=>({
      ...order,
      date:order.createdAt||order.date||'',
      status:order.status||'Order placed',
      items:(Array.isArray(order.items)?order.items:[]).filter(item=>item&&typeof item==='object').map(item=>{
        const product=findProduct(item.sellerEmail,item.productId);
        return {...item,productName:item.productName||product?.name||'Product',icon:product?.icon||'fa-box'};
      })
    }));
    state.wishlist=(Array.isArray(wishlist)?wishlist:[]).filter(item=>item&&typeof item==='object').map(item=>{
      const product=findProduct(item.sellerEmail,item.productId);
      return {...item,productName:item.name||product?.name||'Unavailable product',price:item.price??product?.price??0,
        image:item.image||product?.image||'',sellerName:sellerName(item.sellerEmail),icon:product?.icon||'fa-box'};
    });
    const followedEmails=(Array.isArray(followed)?followed:[]).map(email=>String(email||'').trim().toLowerCase());
    state.stores=followedEmails.map(email=>{
      const seller=getSellerAccounts().find(account=>account&&String(account.email||'').trim().toLowerCase()===email);
      if(!seller)return null;
      const rawCount=seller.followerCount??seller.followers??seller.stats?.followers;
      const count=Array.isArray(rawCount)?rawCount.length:Number(rawCount);
      return {email,name:seller.storeName||seller.name||'Seller Store',
        category:seller.settings?.storeCategory||'',followers:Number.isFinite(count)?String(count):'—'};
    }).filter(Boolean);
    const productsBySeller=getSellerAccounts().flatMap(account=>{
      if(!account||!account.email)return[];
      return getSellerProducts(account.email).map(product=>({sellerEmail:String(account.email).toLowerCase(),product}));
    });
    const email=getReviewingIdentity().email;
    const ownReviews=productsBySeller.flatMap(({sellerEmail,product})=>
      (Array.isArray(product.reviews)?product.reviews:[])
        .filter(review=>review&&email&&!isOwnSellerProduct(sellerEmail)&&String(review.reviewerEmail||'').trim().toLowerCase()===email)
        .map((review,index)=>({id:`${sellerEmail}:${product.id}:${index}`,title:product.name||'Product',
          order:'',status:'Published',icon:product.icon||'fa-box',rating:Number(review.rating)||0,
          body:review.comment||review.body||'',sellerEmail,productId:product.id}))
    );
    const reviewedProducts=new Set(ownReviews.map(review=>`${review.sellerEmail}:${review.productId}`));
    const pendingReviews=state.orders.filter(order=>!['cancelled','canceled'].includes(String(order.status).toLowerCase())).flatMap(order=>(Array.isArray(order.items)?order.items:[])
      .filter(item=>item.sellerEmail&&item.productId!==undefined&&findProduct(item.sellerEmail,item.productId))
      .filter(item=>!isOwnSellerProduct(item.sellerEmail))
      .filter(item=>!reviewedProducts.has(`${String(item.sellerEmail).toLowerCase()}:${item.productId}`))
      .map(item=>{
        const product=findProduct(item.sellerEmail,item.productId);
        return {id:`${String(item.sellerEmail).toLowerCase()}:${item.productId}`,title:item.productName,
          order:order.id,status:'Pending',icon:product?.icon||'fa-box',sellerEmail:String(item.sellerEmail).toLowerCase(),
          productId:item.productId};
      }));
    state.reviews=[...new Map([...ownReviews,...pendingReviews].map(review=>[review.id,review])).values()];
  }
  let toastTimer;
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2400)}
  function empty(icon,title,desc){return `<div class="empty-state"><i class="fa-solid ${icon}"></i><b>${title}</b><p>${desc}</p></div>`}
  function statusClass(s){return s==='Delivered'?'style="background:#eaf3e9;color:#3e7048"':s==='Cancelled'?'style="background:#f9e8e6;color:#a5443c"':''}
  function itemStatus(item,order){return String(item.fulfillmentStatus||item.status||order.status||'Processing')}
  function returnWindowDays(item){
    const savedPolicy=String(item.returnPolicyAtPurchase||'');
    const seller=getSellerAccounts().find(account=>account&&String(account.email||'').trim().toLowerCase()===String(item.sellerEmail||'').trim().toLowerCase());
    const policy=savedPolicy||String(seller?.settings?.returnPolicy||'No returns');
    const match=policy.match(/^(\d+)\s+days?\s+return$/i);
    return match?Number(match[1]):0;
  }
  function processAutomaticRequests(orders){
    let changed=false;
    const now=Date.now();
    orders.forEach(order=>(Array.isArray(order.items)?order.items:[]).forEach(item=>{
      ['cancelRequest','returnRequest'].forEach(key=>{
        const request=item[key];
        if(!request||request.status!=='Pending')return;
        const requestedAt=Date.parse(request.requestedAt||'');
        if(!Number.isFinite(requestedAt)||now-requestedAt<REQUEST_AUTO_DECISION_MS)return;
        let approved;
        if(request.type==='cancel'){
          approved=!['Cancelled','Shipped','Delivered'].includes(itemStatus(item,order));
        }else if(request.type==='return'){
          const deliveredAt=Date.parse(item.deliveredAt||order.deliveredAt||'');
          const days=returnWindowDays(item);
          approved=itemStatus(item,order)==='Delivered'&&days>0&&Number.isFinite(deliveredAt)&&now<=deliveredAt+days*86400000;
        }else{
          return;
        }
        request.status=approved?'Approved':'Rejected';
        request.sellerNote=approved
          ?'Automatically approved after 24 hours without seller response.'
          :'Automatically rejected after 24 hours because the request is no longer eligible.';
        request.reviewedAt=new Date(now).toISOString();
        if(approved&&request.type==='cancel')item.fulfillmentStatus='Cancelled';
        changed=true;
      });
    }));
    return changed;
  }
  function scheduleAutomaticRequestDecision(orders){
    if(requestDecisionTimer!==null)clearTimeout(requestDecisionTimer);
    const dueTimes=orders.flatMap(order=>(Array.isArray(order.items)?order.items:[]).flatMap(item=>
      [item.cancelRequest,item.returnRequest]
        .filter(request=>request&&request.status==='Pending')
        .map(request=>Date.parse(request.requestedAt||'')+REQUEST_AUTO_DECISION_MS)
        .filter(Number.isFinite)
    ));
    if(!dueTimes.length)return;
    const delay=Math.max(0,Math.min(...dueTimes)-Date.now());
    requestDecisionTimer=setTimeout(()=>renderAll(),Math.min(delay,2147483647));
  }
  function hasOpenRequest(item){
    return [item.cancelRequest,item.returnRequest].some(request=>request&&request.status!=='Rejected');
  }
  function canRequestCancel(item,order){
    return !hasOpenRequest(item)&&!['Cancelled','Delivered'].includes(itemStatus(item,order));
  }
  function canRequestReturn(item,order){
    const deliveredAt=item.deliveredAt||order.deliveredAt;
    const days=returnWindowDays(item);
    const delivered=Date.parse(deliveredAt||'');
    return !item.returnRequest&&!(item.cancelRequest&&item.cancelRequest.status!=='Rejected')&&itemStatus(item,order)==='Delivered'&&days>0&&
      Number.isFinite(delivered)&&Date.now()<=delivered+days*86400000;
  }
  function orderDisplayStatus(order){
    const statuses=(order.items||[]).map(item=>itemStatus(item,order));
    if(!statuses.length)return order.status;
    if(statuses.every(status=>status==='Cancelled'))return'Cancelled';
    if(statuses.every(status=>status==='Delivered'))return'Delivered';
    if(statuses.every(status=>status==='Shipped'))return'Shipped';
    if(statuses.every(status=>status==='Processing'))return'Processing';
    return statuses.some(status=>status!=='Processing')?'Partially fulfilled':order.status;
  }
  function submitOrderRequest(orderId,itemIndex,type){
    const orders=readJson(ORDERS_KEY,[]);
    if(!Array.isArray(orders))throw new Error('Saved order data is invalid.');
    const order=orders.find(entry=>entry&&String(entry.id)===String(orderId));
    const item=order&&Array.isArray(order.items)?order.items[Number(itemIndex)]:null;
    if(!item)throw new Error('This order item could not be found.');
    if(type==='cancel'&&!canRequestCancel(item,order))throw new Error('This item is not eligible for a cancellation request.');
    if(type==='return'&&!canRequestReturn(item,order))throw new Error('This item is outside the seller’s return policy.');
    item[`${type}Request`]={type,status:'Pending',reason:`Requested by customer`,requestedAt:new Date().toISOString()};
    localStorage.setItem(ORDERS_KEY,JSON.stringify(orders));
    refreshWebsiteData();
    renderAll();
    toast(`${type==='return'?'Return':'Cancellation'} request sent to the seller.`);
  }
  function itemActions(item,order,index){
    const request=[item.cancelRequest,item.returnRequest].find(entry=>entry&&entry.status==='Pending')||item.returnRequest||item.cancelRequest;
    const details=request?`<small class="request-note">${escapeHtml(request.type==='return'?'Return':'Cancellation')} ${escapeHtml(request.status||'Pending')}${request.sellerNote?`: ${escapeHtml(request.sellerNote)}`:''}</small>`:'';
    const buttons=[];
    if(canRequestCancel(item,order))buttons.push(`<button class="secondary-btn" data-order-request="cancel" data-order="${escapeHtml(order.id)}" data-item-index="${index}">Request cancellation</button>`);
    if(canRequestReturn(item,order))buttons.push(`<button class="secondary-btn" data-order-request="return" data-order="${escapeHtml(order.id)}" data-item-index="${index}">Request return</button>`);
    const delivered= itemStatus(item,order)==='Delivered';
    const noReturns=returnWindowDays(item)===0;
    const expiry=item.deliveredAt||order.deliveredAt;
    const deadline=expiry?Date.parse(expiry)+returnWindowDays(item)*86400000:NaN;
    const returnHint=delivered&&!request?(noReturns?'This seller does not accept returns.':!Number.isFinite(deadline)?'Return eligibility dates are unavailable.':Date.now()>deadline?'The seller’s return window has expired.':'Return requests are available within the seller’s return window.'): '';
    return `<div class="order-item-actions"><span>Status: <b>${escapeHtml(itemStatus(item,order))}</b></span>${details}${buttons.join('')}${returnHint?`<small>${escapeHtml(returnHint)}</small>`:''}</div>`;
  }
  function orderCard(o){const displayStatus=orderDisplayStatus(o);const items=(o.items||[]).map((item,index)=>`<div class="order-lines"><div class="product-emoji"><i class="fa-solid ${escapeHtml(item.icon)}"></i></div><div class="line-main"><b>${escapeHtml(item.productName)}</b><small>Qty: ${Number(item.quantity)||1}${item.optionValue?` · ${escapeHtml(item.optionValue)}`:''} · Sold by ${escapeHtml(sellerName(item.sellerEmail))}</small>${itemActions(item,o,index)}</div><div class="line-price">${money(item.subtotal??Number(item.unitPrice||0)*Number(item.quantity||1))}</div></div>`).join('');return `<article class="order-card"><div class="order-card-head"><div><b>Order #${escapeHtml(o.id)}</b><small>Placed on ${dateFmt(o.date)}</small></div><span class="order-status" ${statusClass(displayStatus)}>${escapeHtml(displayStatus)}</span></div>${items||'<p class="muted">Order items unavailable.</p>'}<div class="order-card-foot"><small>Total: <b>${money(o.total??o.itemsTotal??0)}</b></small></div></article>`}
  function renderHeader(){const p=state.profile,seller=getActiveSellerAccount();const customerName=String(p.name||'').trim();const name=String(seller?.fullName||seller?.name||customerName||'Customer').trim();const email=seller?.email||p.email||'';const cart=readJson(CART_KEY,[]);$('#welcomeName').textContent='Hello, '+name;$('#sidebarName').textContent=name;$('#sidebarEmail').textContent=email||'Add your email';$('#overviewName').textContent=name;const avatar=$('#avatarInitials');avatar.replaceChildren();const initials=name.split(/\s+/).filter(Boolean).map(word=>word[0]).join('').toUpperCase()||'C';if(seller?.storeLogo&&!customerName){const image=document.createElement('img');image.src=seller.storeLogo;image.alt='';avatar.appendChild(image)}else avatar.textContent=initials;$('#orderCount').textContent=state.orders.length;$('#accountCartCount').textContent=Array.isArray(cart)?cart.reduce((sum,item)=>sum+(Number(item.quantity)||0),0):0;$('#statOrders').textContent=state.orders.length;$('#statWishlist').textContent=state.wishlist.length;$('#statReviews').textContent=state.reviews.filter(r=>r.status==='Published').length;$('#statStores').textContent=state.stores.length}
  function renderProfile(){const p=state.profile,seller=getActiveSellerAccount();$('#fullName').value=seller?.fullName||seller?.name||p.name||'';$('#email').value=seller?.email||p.email||'';$('#phone').value=seller?.phone||p.phone||'';['fullName','email','phone'].forEach(id=>{$('#'+id).readOnly=Boolean(seller)});$('#dob').value=p.dob||'';$('#gender').value=p.gender||'Prefer not to say';$('#addressList').innerHTML=state.addresses.length?state.addresses.map(a=>`<article class="address-item"><header><b><i class="fa-solid fa-location-dot"></i> ${escapeHtml(a.label)}</b><button data-address-remove="${a.id}">Remove</button></header><p><b>${escapeHtml(a.recipient)}</b><br>${escapeHtml(a.phone)}<br>${escapeHtml(a.address)}, ${escapeHtml(a.city)}</p></article>`).join(''):empty('fa-location-dot','No saved addresses','Add a delivery address for quicker checkout.')}
  function renderOrders(){const filter=$('#orderTabs .tab.active')?.dataset.filter||'All';const arr=state.orders.filter(order=>filter==='All'||(filter==='Demo order'?order.status==='Demo order':(order.items||[]).some(item=>itemStatus(item,order)===filter)));$('#ordersList').innerHTML=arr.length?arr.map(orderCard).join(''):empty('fa-box-open','No orders here','Orders from your checkout will appear here.')}
  function renderRecent(){const arr=state.orders.slice(0,3);$('#recentOrders').innerHTML=arr.length?arr.map(o=>`<div class="recent-order"><div class="order-thumb"><i class="fa-solid ${escapeHtml(o.items[0]?.icon||'fa-box')}"></i></div><div class="order-main"><b>${escapeHtml(o.items[0]?.productName||'Order')}</b><small>#${escapeHtml(o.id)} · ${dateFmt(o.date)}</small></div><span class="order-status">${escapeHtml(o.status)}</span></div>`).join(''):empty('fa-box-open','No orders yet','Your orders from checkout will show here.')}
  function renderReturns(){const requests=state.orders.flatMap(order=>(order.items||[]).flatMap((item,index)=>[item.cancelRequest,item.returnRequest].filter(Boolean).map(request=>({order,item,index,request}))));$('#returnsList').innerHTML=requests.length?requests.map(({order,item,request})=>`<article class="order-card"><div class="order-card-head"><div><b>${escapeHtml(request.type==='return'?'Return':'Cancellation')} · ${escapeHtml(item.productName||'Product')}</b><small>Order #${escapeHtml(order.id)} · ${dateFmt(order.date)}</small></div><span class="order-status">${escapeHtml(request.status||'Pending')}</span></div><p class="muted">Reason: ${escapeHtml(request.reason||'Not provided')}${request.sellerNote?` · Seller: ${escapeHtml(request.sellerNote)}`:''}</p></article>`).join(''):empty('fa-arrow-rotate-left','No returns or cancellations','Your eligible return and cancellation requests will appear here.')}
  function renderReviews(){const filter=$('#reviewTabs .tab.active')?.dataset.filter||'Pending';const arr=state.reviews.filter(r=>r.status===filter);$('#reviewsList').innerHTML=arr.length?arr.map(r=>`<article class="review-card" data-review-item="${escapeHtml(r.id)}"><div class="product-emoji"><i class="fa-solid ${escapeHtml(r.icon)}"></i></div><div class="review-copy"><b>${escapeHtml(r.title)}</b><p>${r.status==='Pending'?'Purchased in order #'+escapeHtml(r.order):'Your published review'}</p>${r.status==='Published'?`<div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><p>${escapeHtml(r.body)}</p>`:`<div class="review-actions"><select aria-label="Rating for ${escapeHtml(r.title)}" data-review-rating="${escapeHtml(r.id)}" class="review-rating"><option value="">Choose rating</option><option value="5">★★★★★ Excellent</option><option value="4">★★★★☆ Good</option><option value="3">★★★☆☆ Average</option><option value="2">★★☆☆☆ Poor</option><option value="1">★☆☆☆☆ Bad</option></select><input class="review-text" data-review-text="${escapeHtml(r.id)}" placeholder="Write a short review" maxlength="240" aria-label="Write review"/><button class="primary-btn" data-review-submit="${escapeHtml(r.id)}">Publish review</button></div>`}</div></article>`).join(''):empty('fa-star','No reviews here',filter==='Pending'?'Purchased products awaiting your review will appear here.':'Reviews you publish will appear here.')}
  function renderWishlist(){$('#wishlistList').innerHTML=state.wishlist.length?state.wishlist.map(p=>`<article class="product-card"><div class="product-visual"><i class="fa-solid ${escapeHtml(p.icon)}"></i></div><h3>${escapeHtml(p.productName)}</h3><div class="price">${money(p.price)}</div><div class="stock">● Saved in wishlist</div><p class="muted" style="font-size:10px;margin-bottom:10px">Sold by ${escapeHtml(p.sellerName)}</p><button class="secondary-btn" data-wishlist-action="cart" data-seller="${escapeHtml(p.sellerEmail)}" data-id="${escapeHtml(p.productId)}"><i class="fa-solid fa-cart-plus"></i> Move to cart</button><button class="danger-btn" data-wishlist-action="remove" data-seller="${escapeHtml(p.sellerEmail)}" data-id="${escapeHtml(p.productId)}"><i class="fa-regular fa-trash-can"></i> Remove</button></article>`).join(''):empty('fa-heart','Your wishlist is empty','Products saved from the shop will appear here.')}
  function renderStores(){ $('#storesList').innerHTML=state.stores.length?state.stores.map(s=>`<article class="store-card"><div class="store-avatar">${escapeHtml(s.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.category||'NOIRÉ seller')}</p><div class="store-meta"><i class="fa-solid fa-users"></i> ${escapeHtml(s.followers)} followers · Following</div><button class="danger-btn" data-store-unfollow="${escapeHtml(s.email)}"><i class="fa-solid fa-user-minus"></i> Unfollow store</button></article>`).join(''):empty('fa-store','No followed stores','Stores you follow from their profile will appear here.')}
  function renderAll(){refreshWebsiteData();renderHeader();renderProfile();renderOrders();renderRecent();renderReturns();renderReviews();renderWishlist();renderStores()}
  function go(page){$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$$('.page-panel').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));window.location.hash=page;if(page==='profile')renderProfile();if(page==='orders')renderOrders();if(page==='reviews')renderReviews();if(page==='returns')renderReturns();}
  function getItemCategory(item){if(item.category)return item.category;const text=[item.title,item.name,item.seller,item.icon].filter(Boolean).join(' ').toLocaleLowerCase();if(/earbud|headphone|speaker|electronic/.test(text))return'Electronics';if(/shirt|shoe|sneaker|wallet|tote|fashion|apparel/.test(text))return'Fashion';if(/mug|lamp|ceramic|home|living/.test(text))return'Home & Living';if(/beauty|skin|makeup|cosmetic|personal care/.test(text))return'Beauty & Personal Care';if(/sport|outdoor|fitness|camping/.test(text))return'Sports & Outdoors';if(/book|toy|puzzle/.test(text))return'Books & Toys';return''}
  function renderSearch(query,categoryFilter=''){const normalized=query.trim().toLocaleLowerCase();const matches=[];const add=(collection,page,title,details,icon,terms)=>{collection.forEach(item=>{const searchable=[...terms(item),getItemCategory(item)].join(' ').toLocaleLowerCase();if(searchable.includes(normalized)&&(!categoryFilter||getItemCategory(item)===categoryFilter))matches.push({page,title:title(item),details:details(item),icon})})};add(state.orders,'orders',o=>o.title,o=>`Order #${o.id} · ${o.status} · ${o.seller}`,'fa-box',o=>[o.title,o.id,o.status,o.seller]);add(state.wishlist,'wishlist',p=>p.title,p=>`Wishlist · ${p.seller} · ${money(p.price)}`,'fa-heart',p=>[p.title,p.seller,p.price]);add(state.reviews,'reviews',r=>r.title,r=>`${r.status} review · Order #${r.order}`,'fa-star',r=>[r.title,r.order,r.status,r.body]);add(state.stores,'stores',s=>s.name,s=>`Followed store · ${s.category}`,'fa-store',s=>[s.name,s.category]);$('#accountSearchSummary').textContent=`${matches.length} result${matches.length===1?'':'s'} for “${query}”`;$('#accountSearchResults').innerHTML=matches.length?matches.map(item=>`<article class="account-search-result"><span class="account-search-result-icon"><i class="fa-solid ${item.icon}"></i></span><div class="account-search-result-copy"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.details)}</small></div><button type="button" class="inline-link" data-search-result="${item.page}">Open <i class="fa-solid fa-arrow-right"></i></button></article>`).join(''):`<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><b>No matches found</b><p>Try another product, store, order number or review.</p></div>`;$('#accountSearchResults').dataset.query=normalized}
  function submitAccountSearch(form){form.addEventListener('submit',event=>{event.preventDefault();const input=form.querySelector('input[type="search"]');const query=input.value.trim();if(!query){toast('Enter something to search.');input.focus();return}renderSearch(query);go('search');closeAccountNav();$('#accountMobileSearchForm').classList.remove('show-search')})}
  const accountSidebarToggle=$('#accountSidebarToggle');
  const accountSidebarItems=$('#accountSidebarItems');
  accountSidebarToggle.addEventListener('click',()=>{if(!window.matchMedia('(max-width: 768px)').matches)return;const open=accountSidebarItems.classList.toggle('show');accountSidebarToggle.setAttribute('aria-expanded',String(open))});
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
  $$('[data-goto]').forEach(b=>b.addEventListener('click',e=>{if(b.tagName==='A')e.preventDefault();go(b.dataset.goto);if(b.dataset.focusContact==='true')$('#email').focus();if(b.closest('#accountNavLinks'))closeAccountNav();if(b.closest('.categories-menu')){categoriesDropdown.classList.remove('open');categoriesToggle.setAttribute('aria-expanded','false')}}));
  const accountNavToggle=$('#accountNavToggle');
  const accountNavLinks=$('#accountNavLinks');
  function closeAccountNav(){accountNavLinks.classList.remove('show');accountNavToggle.setAttribute('aria-expanded','false');accountNavToggle.innerHTML='<i class="fa-solid fa-bars"></i>'}
  accountNavToggle.addEventListener('click',()=>{const open=accountNavLinks.classList.toggle('show');accountNavToggle.setAttribute('aria-expanded',String(open));accountNavToggle.innerHTML=open?'<i class="fa-solid fa-xmark"></i>':'<i class="fa-solid fa-bars"></i>'});
  const categoriesToggle=$('#accountCategoriesToggle');
  const categoriesDropdown=$('.nav-dropdown');
  categoriesToggle.addEventListener('click',event=>{event.stopPropagation();const open=categoriesDropdown.classList.toggle('open');categoriesToggle.setAttribute('aria-expanded',String(open))});
  document.addEventListener('click',event=>{if(!categoriesDropdown.contains(event.target)){categoriesDropdown.classList.remove('open');categoriesToggle.setAttribute('aria-expanded','false')}});
  document.addEventListener('click',event=>{const searchResult=event.target.closest('[data-search-result]');if(searchResult)go(searchResult.dataset.searchResult)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){categoriesDropdown.classList.remove('open');categoriesToggle.setAttribute('aria-expanded','false');closeAccountNav()}});
  const searchToggle=$('#accountSearchToggle');
  const mobileSearchForm=$('#accountMobileSearchForm');
  searchToggle.addEventListener('click',()=>{const open=mobileSearchForm.classList.toggle('show-search');if(open)$('#accountMobileSearchInput').focus()});
  submitAccountSearch($('#accountSearchForm'));
  submitAccountSearch(mobileSearchForm);
  $('#profileForm').addEventListener('submit',e=>{e.preventDefault();const seller=getActiveSellerAccount();state.profile={name:seller?state.profile.name:$('#fullName').value.trim(),email:seller?state.profile.email:$('#email').value.trim(),phone:seller?state.profile.phone:$('#phone').value.trim(),dob:$('#dob').value,gender:$('#gender').value};save();$('#profileMessage').textContent=seller?'Seller account details are shown from your active seller login.':'Profile saved.';toast(seller?'Seller details are synced from your seller account.':'Profile saved in this browser.')});
  $('#addAddressBtn').addEventListener('click',()=>$('#addressForm').classList.toggle('hidden'));
  $('#cancelAddressBtn').addEventListener('click',()=>$('#addressForm').classList.add('hidden'));
  $('#addressForm').addEventListener('submit',e=>{e.preventDefault();const address={id:Date.now(),label:$('#addressLabel').value.trim(),recipient:$('#recipient').value.trim(),phone:$('#addressPhone').value.trim(),city:$('#city').value.trim(),address:$('#addressText').value.trim()};const oldAccount=localStorage.getItem(KEY),oldAddresses=localStorage.getItem(ADDRESSES_KEY),oldShipping=localStorage.getItem(SHIPPING_ADDRESS_KEY);state.addresses.push(address);try{localStorage.setItem(SHIPPING_ADDRESS_KEY,JSON.stringify({name:address.recipient,phone:address.phone,city:address.city,address:address.address}));save()}catch(error){state.addresses.pop();try{if(oldAccount===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,oldAccount);if(oldAddresses===null)localStorage.removeItem(ADDRESSES_KEY);else localStorage.setItem(ADDRESSES_KEY,oldAddresses);if(oldShipping===null)localStorage.removeItem(SHIPPING_ADDRESS_KEY);else localStorage.setItem(SHIPPING_ADDRESS_KEY,oldShipping)}catch(rollbackError){toast('Unable to restore your saved address. Please reload this page.');return}toast(error instanceof Error?error.message:'Unable to save address. Please check browser storage.');return}e.target.reset();e.target.classList.add('hidden');toast('Address saved for your account and checkout.');try{const continuation=readJson(SHOPPING_CONTINUATION_KEY,null),seller=getActiveSellerAccount();if(continuation&&['cart','checkout'].includes(continuation.destination)&&seller&&String(continuation.sellerEmail||'').trim().toLowerCase()===String(seller.email||'').trim().toLowerCase()){localStorage.removeItem(SHOPPING_CONTINUATION_KEY);window.location.href=continuation.destination==='checkout'?'../Shoppage/checkout/checkout.html':'../Shoppage/cart/cart.html'}}catch(error){toast('Your address was saved, but the shopping page could not be reopened. Continue from your cart or checkout.') }});
  $('#orderTabs').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;$$('.tab', $('#orderTabs')).forEach(x=>x.classList.toggle('active',x===b));renderOrders()});
  $('#reviewTabs').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;$$('.tab', $('#reviewTabs')).forEach(x=>x.classList.toggle('active',x===b));renderReviews()});
  document.addEventListener('click',event=>{
    const moveButton=event.target.closest('[data-wishlist-action="cart"]');
    if(!moveButton)return;
    if(window.noireCustomerAuth&&!window.noireCustomerAuth.requireCustomer('wishlist-cart'))return;
    const email=String(moveButton.dataset.seller||'').trim().toLowerCase();
    const id=String(moveButton.dataset.id||'');
    try{
      const cart=readJson(CART_KEY,[]);
      const wishlist=readJson(WISHLIST_KEY,[]);
      if(!Array.isArray(cart)||!Array.isArray(wishlist))throw new Error('Saved cart or wishlist is invalid.');
      const alreadyInCart=cart.some(item=>item&&String(item.sellerEmail||'').trim().toLowerCase()===email&&String(item.productId)===id);
      if(!alreadyInCart)return;
      const updatedWishlist=wishlist.filter(item=>!item||String(item.sellerEmail||'').trim().toLowerCase()!==email||String(item.productId)!==id);
      if(updatedWishlist.length!==wishlist.length)localStorage.setItem(WISHLIST_KEY,JSON.stringify(updatedWishlist));
      renderAll();
      toast('This product was already in your cart and has been removed from your wishlist.');
    }catch(error){
      toast(error instanceof Error?error.message:'Unable to sync cart and wishlist.');
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
  document.addEventListener('click',e=>{
    const orderRequest=e.target.closest('[data-order-request]');
    if(orderRequest){
      try{submitOrderRequest(orderRequest.dataset.order,orderRequest.dataset.itemIndex,orderRequest.dataset.orderRequest)}
      catch(error){toast(error instanceof Error?error.message:'Unable to save your request.')}
      return;
    }
    const remAddr=e.target.closest('[data-address-remove]');if(remAddr){state.addresses=state.addresses.filter(a=>String(a.id)!==remAddr.dataset.addressRemove);if(!state.addresses.length)localStorage.removeItem(SHIPPING_ADDRESS_KEY);else{const primary=state.addresses[0];localStorage.setItem(SHIPPING_ADDRESS_KEY,JSON.stringify({name:primary.recipient,phone:primary.phone,city:primary.city,address:primary.address}))}save();toast('Address removed.');return}
    const reviewBtn=e.target.closest('[data-review-submit]');if(reviewBtn){const review=state.reviews.find(item=>item.id===reviewBtn.dataset.reviewSubmit);if(!review)return;if(isOwnSellerProduct(review.sellerEmail)){toast('You cannot review products from your own seller account.');refreshWebsiteData();renderAll();return}const reviewer=getReviewingIdentity();if(!reviewer.email){toast('Save your email in Manage My Account before publishing a review.');return}const card=reviewBtn.closest('[data-review-item]'),rating=card.querySelector('[data-review-rating]').value,body=card.querySelector('[data-review-text]').value.trim();if(!rating){toast('Please choose a rating first.');return}if(!body){toast('Please write a short review first.');return}try{const key='noireSellerProducts_'+review.sellerEmail,products=readJson(key,[]);if(!Array.isArray(products))throw new Error('Seller product data is invalid.');const product=products.find(item=>item&&String(item.id)===String(review.productId));if(!product)throw new Error('This purchased product is no longer available.');product.reviews=Array.isArray(product.reviews)?product.reviews:[];product.reviews.push({reviewer:reviewer.name,reviewerEmail:reviewer.email,rating:Number(rating),comment:body,createdAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(products));renderAll();toast('Review saved to the product and your account.')}catch(error){toast(error instanceof Error?error.message:'Unable to save the review.')}return}
    const wl=e.target.closest('[data-wishlist-action]');if(wl){const email=wl.dataset.seller,id=wl.dataset.id;try{const wishlist=readJson(WISHLIST_KEY,[]);if(!Array.isArray(wishlist))throw new Error('Saved wishlist is invalid.');const entry=wishlist.find(item=>item&&String(item.sellerEmail||'').trim().toLowerCase()===String(email||'').trim().toLowerCase()&&String(item.productId)===id);if(!entry)throw new Error('This wishlist item is no longer available.');if(wl.dataset.wishlistAction==='remove'){localStorage.setItem(WISHLIST_KEY,JSON.stringify(wishlist.filter(item=>item!==entry)));renderAll();toast('Removed from wishlist.')}else{const activeSeller=getActiveSellerAccount();if(activeSeller&&String(activeSeller.email).trim().toLowerCase()===String(email||'').trim().toLowerCase()){toast('You cannot shop products from your own seller account.');return}const cart=readJson(CART_KEY,[]);if(!Array.isArray(cart))throw new Error('Saved cart is invalid.');const alreadyInCart=cart.some(item=>item&&String(item.sellerEmail||'').trim().toLowerCase()===String(email||'').trim().toLowerCase()&&String(item.productId)===id);if(alreadyInCart){toast('This product is already in your cart.');return}const previousCart=localStorage.getItem(CART_KEY),previousWishlist=localStorage.getItem(WISHLIST_KEY);cart.push({sellerEmail:email,productId:entry.productId,optionValue:'',quantity:1});try{localStorage.setItem(CART_KEY,JSON.stringify(cart));localStorage.setItem(WISHLIST_KEY,JSON.stringify(wishlist.filter(item=>item!==entry)))}catch(error){if(previousCart===null)localStorage.removeItem(CART_KEY);else localStorage.setItem(CART_KEY,previousCart);if(previousWishlist===null)localStorage.removeItem(WISHLIST_KEY);else localStorage.setItem(WISHLIST_KEY,previousWishlist);throw error}renderAll();toast('Product moved to your cart.')}}catch(error){toast(error instanceof Error?error.message:'Unable to update wishlist.')}return}
    const unf=e.target.closest('[data-store-unfollow]');if(unf){let previousAccounts=null,previousFollows=null;try{const followed=readJson(FOLLOW_KEY,[]);if(!Array.isArray(followed))throw new Error('Followed store data is invalid.');const email=unf.dataset.storeUnfollow,updatedFollows=followed.filter(item=>String(item).toLowerCase()!==email.toLowerCase());const accounts=getSellerAccounts(),accountIndex=accounts.findIndex(account=>account&&String(account.email||'').trim().toLowerCase()===email.toLowerCase());if(accountIndex>=0){const seller=accounts[accountIndex],raw=seller.followerCount??seller.followers??seller.stats?.followers,count=Array.isArray(raw)?raw.length:Number(raw);previousAccounts=localStorage.getItem('noireSellerAccounts');accounts[accountIndex]={...seller,followerCount:Math.max(0,(Number.isFinite(count)?count:0)-1)};localStorage.setItem('noireSellerAccounts',JSON.stringify(accounts))}previousFollows=localStorage.getItem(FOLLOW_KEY);localStorage.setItem(FOLLOW_KEY,JSON.stringify(updatedFollows));renderAll();toast('Store unfollowed.')}catch(error){try{if(previousAccounts!==null)localStorage.setItem('noireSellerAccounts',previousAccounts);if(previousFollows===null)localStorage.removeItem(FOLLOW_KEY);else if(previousFollows!==null)localStorage.setItem(FOLLOW_KEY,previousFollows)}catch(rollbackError){toast('Unable to restore followed-store data. Please reload this page.');return}toast(error instanceof Error?error.message:'Unable to unfollow store.')}return}
  });
  const sellerMenu=$('#accountSellerMenu');
  const sellerNavLink=$('#sellerNavLink');
  const sellerSidebarLink=$('#sellerSidebarLink');
  const sellerNavLabel=sellerNavLink.querySelector('.seller-menu-label');
  const sellerDropdown=$('#sellerDropdown');
  const sellerLogoutButton=$('#sellerLogoutButton');
  let loggedInSeller=null;
  try{
    loggedInSeller=getActiveSellerAccount();
    syncSellerCustomerProfile();
  }catch(error){
    toast('Seller session data could not be read.');
  }
  function hasReturningSeller(){
    if(localStorage.getItem('noireSellerLoggedOut')==='true')return true;
    try{
      const accounts=readJson('noireSellerAccounts',[]);
      return Array.isArray(accounts)&&accounts.some(account=>account&&account.email);
    }catch(error){
      toast('Seller account data could not be read.');
      return false;
    }
  }
  function openSellerDestination(){
    if(loggedInSeller){
      const open=sellerDropdown.hidden;
      sellerDropdown.hidden=!open;
      sellerMenu.classList.toggle('open',open);
      sellerNavLink.setAttribute('aria-expanded',String(open));
      return;
    }
    window.location.href=hasReturningSeller()?sellerMenu.dataset.loginUrl:sellerMenu.dataset.registerUrl;
  }
  function closeSellerDropdown(){
    sellerDropdown.hidden=true;
    sellerMenu.classList.remove('open');
    sellerNavLink.setAttribute('aria-expanded','false');
  }
  if(loggedInSeller){
    const loggedInAccount=getSellerAccounts().find(account=>
      account&&String(account.email||'').trim().toLowerCase()===String(loggedInSeller.email).trim().toLowerCase()
    );
    sellerNavLabel.textContent=loggedInSeller.storeName||loggedInAccount?.storeName||'My Store';
    sellerMenu.classList.add('is-logged-in');
    sellerNavLink.setAttribute('aria-label',`Open ${sellerNavLabel.textContent} seller options`);
  }else{
    sellerNavLabel.textContent='Become a seller';
    sellerNavLink.setAttribute('aria-label','Become a seller');
  }
  sellerMenu.querySelector('[data-seller-destination="dashboard"]').href=sellerMenu.dataset.dashboardUrl;
  sellerMenu.querySelector('[data-seller-destination="settings"]').href=sellerMenu.dataset.settingsUrl;
  sellerNavLink.addEventListener('click',openSellerDestination);
  sellerLogoutButton.addEventListener('click',()=>{
    localStorage.removeItem('noireLoggedInSeller');
    localStorage.setItem('noireSellerLoggedOut','true');
    loggedInSeller=null;
    sellerNavLabel.textContent='Become a seller';
    sellerMenu.classList.remove('is-logged-in');
    sellerNavLink.setAttribute('aria-label','Become a seller');
    closeSellerDropdown();
    renderAll();
  });
  document.addEventListener('click',event=>{if(!sellerMenu.contains(event.target))closeSellerDropdown()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!sellerDropdown.hidden){closeSellerDropdown();sellerNavLink.focus()}});
  sellerSidebarLink.addEventListener('click',openSellerDestination);
  $('#passwordInfo').addEventListener('click',()=>alert('A production site must verify the current user and change passwords on a secure backend. This static demo does not store or change passwords.'));
  function clearDemo(){if(!confirm('Clear your saved account profile and delivery addresses? Your orders, wishlist and followed stores will remain unchanged.'))return;state.profile={name:'',email:'',phone:'',dob:'',gender:'Prefer not to say'};state.addresses=[];localStorage.removeItem(SHIPPING_ADDRESS_KEY);save();$('#addressForm').classList.add('hidden');$('#profileMessage').textContent='';toast('Account profile and saved addresses cleared.')}
  $('#clearDataBtn').addEventListener('click',clearDemo);
  $('#year').textContent=new Date().getFullYear();
  let shoppingContinuation=null;
  try{shoppingContinuation=readJson(SHOPPING_CONTINUATION_KEY,null)}catch(error){toast('Saved shopping action could not be read.')}
  const start=location.hash.replace('#','');const valid=['overview','profile','addresses','orders','returns','reviews','wishlist','stores','messages','security'];go(start==='addresses'?'profile':valid.includes(start)?start:'overview');renderAll();
  if(start==='addresses'){
    $('#addressForm').classList.remove('hidden');
    $('#addressLabel').value='Home';
    $('#recipient').value=state.profile.name;
    $('#addressPhone').value=state.profile.phone;
    $('#city').focus();
  }
  if(shoppingContinuation&&['cart','checkout'].includes(shoppingContinuation.destination)&&loggedInSeller&&String(shoppingContinuation.sellerEmail||'').trim().toLowerCase()===String(loggedInSeller.email||'').trim().toLowerCase()){
    go('profile');
    $('#addressForm').classList.remove('hidden');
    $('#addressLabel').value='Home';
    $('#recipient').value=loggedInSeller.fullName||loggedInSeller.name||state.profile.name||'';
    $('#addressPhone').value=loggedInSeller.phone||state.profile.phone||'';
    $('#city').focus();
  }else if(shoppingContinuation){
    localStorage.removeItem(SHOPPING_CONTINUATION_KEY);
  }
  window.addEventListener('storage',event=>{
    if(!event.key||[KEY,ORDERS_KEY,WISHLIST_KEY,FOLLOW_KEY,CART_KEY,SHIPPING_ADDRESS_KEY,ADDRESSES_KEY,'noireSellerAccounts','noireLoggedInSeller'].includes(event.key)||event.key.startsWith('noireSellerProducts_')){
      if([KEY,SHIPPING_ADDRESS_KEY,ADDRESSES_KEY].includes(event.key))state=load();
      if(event.key==='noireLoggedInSeller'||event.key===null){
        try{loggedInSeller=getActiveSellerAccount()}catch(error){toast('Seller session data could not be read.')}
        sellerNavLabel.textContent=loggedInSeller?.storeName||loggedInSeller?.fullName||'Become a seller';
        sellerMenu.classList.toggle('is-logged-in',Boolean(loggedInSeller));
      }
      renderAll();
    }
  });
})();
