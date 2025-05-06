// components/auth/LoginForm.js
export default function LoginForm() {
    return (
      <form className="p-6 bg-white rounded-lg shadow-md space-y-4">
        <h2 className="text-2xl font-bold">Login</h2>
        <input type="email" placeholder="Email" className="w-full border p-2 rounded" />
        <input type="password" placeholder="Password" className="w-full border p-2 rounded" />
        <button className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
          Sign In
        </button>
      </form>
    );
  }
  