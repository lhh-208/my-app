import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import URL from "../../config/urlconfg";
import "./Login.css"; // 引入样式文件

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${URL.domain}api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "请求失败");
      }
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log("登陆失败原因：", error);
    }
  };

  return (
    <div className="login-container">
      <h1>欢迎回来</h1>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="username">手机号或邮箱</label>
          <input
            type="text"
            id="username"
            name="username"
            required
            placeholder="请输入手机号或邮箱"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">密码</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="login-btn">
          登录
        </button>
      </form>
      <div className="footer-links">
        <p>
          <a href="#">忘记密码？</a>
        </p>
        <p>
          还没有账户？ <Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
