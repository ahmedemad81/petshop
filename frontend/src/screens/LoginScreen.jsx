import { useState, useEffect } from "react";
import PageTitle from "../components/PageTitle";
import { Container, Form, Button, Row, Col, Card } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import signInImg from "../assets/sign-in.png";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../slices/authSlice";
import { useLoginMutation, useVerifyMfaUserMutation } from "../slices/usersApiSlice";
import { toast } from "react-toastify";

const LoginScreen = () => {
  const [step, setStep] = useState("password"); // "password" | "mfa"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mfaCode, setMfaCode] = useState("");
  const [mfaToken, setMfaToken] = useState("");

  const navigator = useNavigate();
  const dispatch = useDispatch();

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [verifyMfaUser, { isLoading: isVerifying }] = useVerifyMfaUserMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const { search } = useLocation();
  const redirect = search ? new URLSearchParams(search).get("redirect") : "/";

  useEffect(() => {
    if (userInfo) navigator(redirect);
  }, [navigator, redirect, userInfo]);

  const submitPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password }).unwrap();

      // MFA path
      if (res?.mfaRequired) {
        setMfaToken(res.mfaToken);
        setStep("mfa");
        toast.info("We sent a 6-digit code to your email.");
        return;
      }

      // Normal path
      dispatch(setCredentials({ ...res }));
      navigator(redirect);
    } catch (error) {
      toast.error(error?.data?.message || error?.error || "Unknown Error");
    }
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    try {
      const res = await verifyMfaUser({ mfaToken, code: mfaCode }).unwrap();
      dispatch(setCredentials({ ...res }));
      navigator(redirect);
    } catch (error) {
      toast.error(error?.data?.message || error?.error || "Invalid code");
    }
  };

  const loading = isLoggingIn || isVerifying;

  return (
    <Container>
      <Row className="justify-content-md-center py-5 my-3">
        <Col xs={12} md={6} lg={5} xl={4}>
          <Card className="px-4 pb-4 pt-3 rounded shadow" border="light">
            <PageTitle title={step === "mfa" ? "Verify Code" : "Sign In"} />

            {step === "password" ? (
              <Form onSubmit={submitPassword} className="d-grid">
                <Form.Group controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </Form.Group>

                <Form.Group controlId="password" className="mt-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="mt-4 rounded-pill px-4"
                  disabled={!email || !password || loading}
                >
                  {loading && <Loader />}
                  <span className="ms-2">Sign In</span>
                </Button>

                <Row className="py-3">
                  <Col>
                    New Customer?{" "}
                    <Link
                      to={redirect ? `/register?redirect=${redirect}` : `/register`}
                      className="text-primary"
                    >
                      Register here
                    </Link>
                  </Col>
                </Row>
              </Form>
            ) : (
              <Form onSubmit={submitMfa} className="d-grid">
                <Form.Group controlId="mfa">
                  <Form.Label>6-digit code</Form.Label>
                  <Form.Control
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="mt-4 rounded-pill px-4"
                  disabled={mfaCode.length !== 6 || loading}
                >
                  {loading && <Loader />}
                  <span className="ms-2">Verify</span>
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    setStep("password");
                    setMfaCode("");
                    setMfaToken("");
                  }}
                >
                  Back to login
                </Button>
              </Form>
            )}
          </Card>
        </Col>

        <Col xs={12} md={6} lg={5} xl={4} className="pt-3 text-center">
          <img src={signInImg} alt="a dog says welcome back" width={380} />
        </Col>
      </Row>
    </Container>
  );
};

export default LoginScreen;
