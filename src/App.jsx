import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL

function currency(n){
  return new Intl.NumberFormat(undefined, { style:'currency', currency:'USD' }).format(n || 0)
}

function App() {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [paid, setPaid] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const filtered = useMemo(()=>products, [products])

  async function fetchProducts(q=''){
    const url = new URL(`${API_BASE}/api/products`)
    if(q) url.searchParams.set('q', q)
    const res = await fetch(url)
    const data = await res.json()
    setProducts(data)
  }

  useEffect(()=>{ fetchProducts('') },[])

  function addToCart(p){
    setCart(prev=>{
      const exists = prev.find(i=>i.product_id===p._id)
      const qty = exists ? exists.quantity + 1 : 1
      if(qty > p.stock) return prev
      const line = { product_id: p._id, name: p.name, sku: p.sku, price: p.price, quantity: qty }
      const next = prev.filter(i=>i.product_id!==p._id).concat({ ...line })
      return next
    })
  }

  function updateQty(id, qty){
    setCart(prev => prev.map(i=> i.product_id===id ? { ...i, quantity: Math.max(1, qty) } : i))
  }

  function removeFromCart(id){
    setCart(prev => prev.filter(i=> i.product_id!==id))
  }

  const total = useMemo(()=>{
    return cart.reduce((s,i)=> s + i.price * i.quantity, 0)
  },[cart])

  async function checkout(){
    setLoading(true)
    setMessage('')
    try{
      const res = await fetch(`${API_BASE}/api/sales`,{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ items: cart, paid: Number(paid)||0 })
      })
      if(!res.ok){
        const err = await res.json().catch(()=>({detail:'Error'}))
        throw new Error(err.detail || 'Checkout failed')
      }
      const data = await res.json()
      setMessage(`Sale saved. Change: ${currency(data.change)}`)
      setCart([])
      setPaid('')
      fetchProducts(query)
    }catch(e){
      setMessage(e.message)
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">School Mini-Market POS</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-3 mb-4">
              <input value={query} onChange={e=>{ setQuery(e.target.value); fetchProducts(e.target.value) }} placeholder="Search name, SKU or barcode" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(p=> (
                <button key={p._id} onClick={()=>addToCart(p)} className="text-left bg-gray-50 hover:bg-gray-100 border rounded-lg p-3 transition">
                  <div className="font-semibold text-gray-800">{p.name}</div>
                  <div className="text-sm text-gray-500">SKU {p.sku}</div>
                  <div className="text-sm text-gray-500">Stock {p.stock}</div>
                  <div className="mt-2 text-indigo-600 font-bold">{currency(p.price)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-gray-700 mb-3">Cart</h2>
            <div className="space-y-3 max-h-80 overflow-auto">
              {cart.length===0 && <div className="text-gray-400">No items</div>}
              {cart.map(it=> (
                <div key={it.product_id} className="flex items-center justify-between gap-2 border-b pb-2">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-gray-500">{currency(it.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} value={it.quantity} onChange={e=>updateQty(it.product_id, Number(e.target.value))} className="w-16 border rounded px-2 py-1" />
                    <div className="w-20 text-right font-semibold">{currency(it.price * it.quantity)}</div>
                    <button onClick={()=>removeFromCart(it.product_id)} className="text-red-500 text-sm">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total</span>
                <span className="font-semibold text-gray-800">{currency(total)}</span>
              </div>
              <input type="number" value={paid} onChange={e=>setPaid(e.target.value)} placeholder="Paid amount" className="w-full border rounded-lg px-3 py-2" />
              <button disabled={loading || cart.length===0} onClick={checkout} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg">
                {loading ? 'Processing...' : 'Checkout'}
              </button>
              {message && <div className="text-sm text-center text-gray-700">{message}</div>}
            </div>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <AddProduct onAdded={()=>fetchProducts(query)} />
          <RecentSales />
        </div>
      </div>
    </div>
  )
}

function AddProduct({ onAdded }){
  const [form, setForm] = useState({ name:'', sku:'', price:'', stock:'', category:'' })
  const [msg, setMsg] = useState('')

  async function submit(){
    setMsg('')
    try{
      const payload = { ...form, price: Number(form.price)||0, stock: Number(form.stock)||0 }
      const res = await fetch(`${API_BASE}/api/products`,{
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      })
      if(!res.ok){
        const err = await res.json().catch(()=>({detail:'Error'}))
        throw new Error(err.detail)
      }
      setMsg('Product added')
      setForm({ name:'', sku:'', price:'', stock:'', category:'' })
      onAdded?.()
    }catch(e){ setMsg(e.message) }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Add Product</h3>
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="border rounded px-3 py-2"/>
        <input placeholder="SKU" value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} className="border rounded px-3 py-2"/>
        <input type="number" placeholder="Price" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} className="border rounded px-3 py-2"/>
        <input type="number" placeholder="Stock" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} className="border rounded px-3 py-2"/>
        <input placeholder="Category" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="border rounded px-3 py-2 col-span-2"/>
      </div>
      <button onClick={submit} className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">Save</button>
      {msg && <div className="text-sm mt-2 text-gray-600">{msg}</div>}
    </div>
  )
}

function RecentSales(){
  const [sales, setSales] = useState([])
  useEffect(()=>{ (async()=>{
    const res = await fetch(`${API_BASE}/api/sales`)
    const data = await res.json()
    setSales(data)
  })() },[])
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Recent Sales</h3>
      <div className="divide-y">
        {sales.map(s=> (
          <div key={s._id} className="py-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{currency(s.total)}</span>
              <span className="text-gray-500">{new Date(s.created_at).toLocaleString?.() || ''}</span>
            </div>
            <div className="text-gray-500">{s.items?.map(i=>`${i.quantity}x ${i.name}`).join(', ')}</div>
          </div>
        ))}
        {sales.length===0 && <div className="text-gray-400 text-sm">No sales yet</div>}
      </div>
    </div>
  )
}

export default App
