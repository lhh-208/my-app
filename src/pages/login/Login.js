import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import URL from "../../config/urlconfg";
import "./Login.css"; // 引入样式文件

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetch(`${URL.domain}api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        message.error(data.message);
      }
    } catch (error) {
      // console.log("登陆失败原因：", error);
      message.error("登陆失败，请检查账户密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>登录账号</h1>
      <Form
        name="login"
        onFinish={handleSubmit}
        layout="vertical"
        className="login-form"
      >
        <Form.Item
          label="手机号或邮箱"
          name="username"
          rules={[{ required: true, message: "请输入手机号或邮箱" }]}
        >
          <Input placeholder="请输入手机号或邮箱" />
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[{ required: true, message: "请输入密码" }]}
        >
          <Input.Password placeholder="请输入密码" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form.Item>
      </Form>
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
