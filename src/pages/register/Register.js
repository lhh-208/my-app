import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import URL from "../../config/urlconfg";
import "../login/Login.css"; // 引入相同的样式文件

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetch(`${URL.domain}api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (response.ok) {
        message.success("注册成功！");
        navigate("/login");
      } else {
        message.error(data.message);
      }
    } catch (error) {
      console.log("注册失败原因：", error);
      message.error("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>注册</h1>
      <Form
        name="register"
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
            注册
          </Button>
        </Form.Item>
      </Form>
      <div className="footer-links">
        <p>
          已有账户？ <Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
