let orderData = []
let chartType = 'category'
const orderList = document.querySelector(".orderTable tbody")
//--初始化--//
function init(){
  getOrderList()
}
init()
//--取得所有訂單、渲染圖表及表格--//
function getOrderList() {
  axios
    .get(`https://livejs-api.hexschool.io/api/livejs/v1/admin/${apiPath}/orders`,{
      headers:{
        Authorization:apiKey
      }
    })
    .then(res => {
      orderData = res.data.orders
      renderOrderList(orderData)
      renderChar(orderData,chartType)
    })
}
//--選染訂單表格--//
function renderOrderList(orderData,sortby = "newest"){
  
  //判斷排序方式
  if(sortby == "newest") {
    orderData.sort((a,b) => b.createdAt - a.createdAt)
  }else {
    orderData.sort((b,a) => b.createdAt - a.createdAt)
  }
  
  orderList.innerHTML = orderData.map((item,index) => {
    let {user} = item
    //組時間字串,item.createdAt傳回只有10碼(秒),new Date要求13碼(毫秒)
    let date = new Date(item.createdAt * 1000)
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    let d = date.getDate()
    let createdAtStr = `${year}/${month}/${d}`
   
    return `<tr>
      <td>${item.id}</td>
      <td>
        <p>${user.name}</p>
        <p>${user.tel}</p>
      </td>
      <td>${user.address}</td>
      <td>${user.email}</td>
      <td>
        ${item.products.map(product=> `<p>${product.title} x ${product.quantity}</p>`).join("")}
      </td>
      <td>${createdAtStr}</td>
      <td class="orderStatus" data-index="${index+1}">
        <a href="javascript:void(0)" data-id="${item.id}" data-status="${item.paid}">${item.paid === false ? '未處理':'已處理'}</a>
      </td>
      <td>
        <input type="button" class="del-orderBtn" value="刪除" data-id="${item.id}"/>
      </td>
    </tr>`
  }).join("")
}
//--渲染圖表預處理,chartType接收title或category(轉為各商品品項或各商品分類)--//
function updateChart(orderData,chartType){
  const dataObj = {}
  let columnsAry = []
  //轉資料格式 => {a:xxx,b:xxx}
  orderData.forEach(orderItem => {
    orderItem.products.forEach(product => {
      let {price,quantity} = product
      let dataName = product[chartType]
      if(dataObj[dataName] === undefined) {
        dataObj[dataName] = price * quantity
      }else{
        dataObj[dataName] += price * quantity
      }
    })
  })
  //轉換為C3所需格式將dataObj轉為columnsAry => [['data1',XXX],['data2',xxx]]
  Object.keys(dataObj).forEach(dataName => {
    let columnsItemAry = []
    columnsItemAry.push(dataName)
    columnsItemAry.push(dataObj[dataName])
    columnsAry.push(columnsItemAry)
  })
  return columnsAry
}
//--根據chartType渲染圖表--//
const chartText = document.querySelector(".chart-text")
const chart = document.querySelector("#chart")

function renderChar(orderData,chartType){ 
  chartText.style.display = "none"
  chart.style.display = "block"

  //訂單資料orderData為空顯示提示字、終止渲染
  if(!orderData.length) {
    chartText.style.display = "block"
    chart.style.display = "none"
    return
  }

  let columnsAry = updateChart(orderData,chartType)
  if(chartType === 'title') {
    let otherTotal = 0
    columnsAry.sort((a,b) => b[1] - a[1]).forEach((item,index) => {
      if(index > 2) otherTotal += item[1]
    })
    columnsAry = columnsAry.slice(0,3)
    if(otherTotal != 0) {
      columnsAry.push(['其它',otherTotal])
    }
  }
  let c = c3.generate({
    data: {
      columns: [],
      type: 'pie',
    },
    legend: {
      position: 'bottom'
    }
  })
  function animateChart(index) {
    if (index >= columnsAry.length) return

    setTimeout(() => {
      c.load({
        columns: [columnsAry[index]]
      });
      animateChart(index + 1)
    }, 200);
  }
  animateChart(0)
}
//--圖表tabs切換--//
const tabs = document.querySelector(".chart-tabs")
tabs.addEventListener("click",e => {
  let target = e.target
  tabs.querySelector(".active").classList.remove("active")
  target.classList.add("active")
  if(target.dataset.chart === "category") {
    chartType = "category"
  }else if(target.dataset.chart === "title"){
    chartType = "title"
  }
  renderChar(orderData,chartType)
})
//--orderList事件委託監聽訂單狀態、刪除單筆訂單--//
orderList.addEventListener("click",function(e){
  e.preventDefault()
  const target = e.target
  const isDel = target.classList.contains("del-orderBtn")
  const isOrderStatus = target.tagName === "A"
  let id = target.dataset.id
  if(isDel) {
    deleteOrderItem(id,target)
  }
  if(isOrderStatus){
    let status = target.dataset.status
    changeOrderStatus(id,status,target)
  }
})
//--修改訂單狀態--//
function changeOrderStatus(id,status,link){
  let newStatus = status === "true" ? false : true
  const putData = {
    data:{
      id:id,
      paid:newStatus
    }
  }
  const renderTarget = link.closest("td")
  axios
    .put(`https://livejs-api.hexschool.io/api/livejs/v1/admin/${apiPath}/orders`,putData,{
      headers:{
        authorization:apiKey
      }
    })
    .then(res =>{    
      //保持前後端資料一致
      orderData = res.data.orders
      alert("修改訂單成功")
      //不重新選染整個表格只對被操作的元素做更新
      renderTarget.innerHTML = `
        <a href="javascript:void(0)" data-id="${id}" data-status="${newStatus}">${newStatus === true ? '已處理':'未處理'}</a>
      `
    })
    .catch(e => {
      alert(`修改訂單出現錯誤`)
    })  
}
//--刪除單筆訂單--//
function deleteOrderItem(id,delBtn){

  const renderTarget = delBtn.closest("tr")
  axios
    .delete(`https://livejs-api.hexschool.io/api/livejs/v1/admin/${apiPath}/orders/${id}`,{
      headers:{
        authorization:apiKey
      }
    })
    .then(res => {
      //保持前後端資料一致
      alert("成功刪除訂單")
      orderData = res.data.orders
      renderChar(orderData,chartType)
      renderTarget.remove() 
    })
    
}
//--orderList排序切換--//
const sortBtns = document.querySelectorAll(".sort-box button");
sortBtns.forEach(btn => {
  btn.addEventListener("click",function() {
    document.querySelector(".sort-box button.active").classList.remove("active")
    this.classList.add("active")
    renderOrderList(orderData,this.dataset.sortby)
  })
})