import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import URL from "../../config/urlconfg";
import "../login/Login.css"; // 引入相同的样式文件

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${URL.domain}api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        navigate("/login");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.log("注册失败原因：", error);
    }
  };

  return (
    <div className="login-container">
      <h1>注册</h1>
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
          注册
        </button>
      </form>
      <div className="footer-links">
        <p>
          已有账户？ <Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
