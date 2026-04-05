import { useMemo, useState } from "react";
import StudentNavbar from "../../components/StudentNavbar";

function getCart() {
  try {
    return JSON.parse(sessionStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

function setCart(items) {
  sessionStorage.setItem("cart", JSON.stringify(items));
}

function getPurchased() {
  try {
    return JSON.parse(sessionStorage.getItem("purchased") || "[]");
  } catch {
    return [];
  }
}

function setPurchased(items) {
  sessionStorage.setItem("purchased", JSON.stringify(items));
}

export default function CartCheckout() {
  const [cart, setCartState] = useState(getCart());
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  const removeItem = (id) => {
    const next = cart.filter((item) => item.id !== id);
    setCart(next);
    setCartState(next);
  };

  const handleCheckout = () => {
    if (!cart.length) return;
    const purchased = getPurchased();
    const merged = [...purchased, ...cart];
    setPurchased(merged);
    setCart([]);
    setCartState([]);
    alert("Purchase successful! Courses added to My Courses.");
    window.location.hash = "#/my-courses";
  };

  return (
    <div className="studentPage">
      <StudentNavbar />
      <main className="studentMain">
        <section className="studentSection">
          <h2>Cart</h2>
          {!cart.length ? (
            <div className="studentEmpty">Your cart is empty.</div>
          ) : (
            <div className="cartGrid">
              <div className="cartList">
                {cart.map((item) => (
                  <div key={item.id} className="cartItem">
                    <div>
                      <div className="cartTitle">{item.title}</div>
                      <div className="cartMeta">{item.category} • {item.level}</div>
                    </div>
                    <div className="cartActions">
                      <div className="cartPrice">₹{item.price}</div>
                      <button className="studentGhost" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="checkoutCard">
                <div className="checkoutTitle">Checkout</div>
                <div className="checkoutRow">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
                <div className="checkoutForm">
                  <input className="authInput" placeholder="Cardholder name" />
                  <input className="authInput" placeholder="Card number" />
                  <div className="checkoutRow">
                    <input className="authInput" placeholder="MM/YY" />
                    <input className="authInput" placeholder="CVC" />
                  </div>
                </div>
                <button className="studentPrimary" onClick={handleCheckout}>
                  Pay ₹{total}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
