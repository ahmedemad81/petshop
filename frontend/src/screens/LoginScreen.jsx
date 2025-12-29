import { useEffect, useRef, useState } from "react";
import PageTitle from "../components/PageTitle";
import { Container, Form, Button, Row, Col, Card } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import signInImg from "../assets/sign-in.png";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../slices/authSlice";
import {
  useLoginMutation,
  useVerifyMfaUserMutation,
  useAuthGoogleMutation,
} from "../slices/usersApiSlice";
import { toast } from "react-toastify";

const LoginScreen = () => {
  const [step, setStep] = useState("password"); // "password" | "mfa"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mfaCode, setMfaCode] = useState("");
  const [mfaToken, setMfaToken] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [verifyMfaUser, { isLoading: isVerifying }] = useVerifyMfaUserMutation();
  const [authGoogle, { isLoading: isGoogleLoading }] = useAuthGoogleMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const { search } = useLocation();
  const redirect = search ? new URLSearchParams(search).get("redirect") : "/";

  const googleBtnRef = useRef(null);
  const googleInitRef = useRef(false);

  useEffect(() => {
    if (userInfo) navigate(redirect);
  }, [userInfo, navigate, redirect]);

  useEffect(() => {
    if (step !== "password") return;

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return; // make sure you set REACT_APP_GOOGLE_CLIENT_ID

    // Wait until the script is available
    if (!window.google?.accounts?.id) return;
    if (!googleBtnRef.current) return;

    if (!googleInitRef.current) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            if (!response?.credential) {
              toast.error("Google login failed");
              return;
            }

            const res = await authGoogle({ credential: response.credential }).unwrap();

            if (res?.mfaRequired) {
              setMfaToken(res.mfaToken);
              setStep("mfa");
              toast.info("We sent a 6-digit code to your email.");
              return;
            }

            dispatch(setCredentials({ ...res }));
            navigate(redirect);
          } catch (error) {
            toast.error(error?.data?.message || error?.error || "Google login failed");
          }
        },
      });

      googleInitRef.current = true;
    }

    // Avoid duplicated buttons
    googleBtnRef.current.innerHTML = "";

    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      text: "signin_with",
      shape: "pill",
      size: "large",
      width: 320,
    });
  }, [step, authGoogle, dispatch, navigate, redirect]);

  const submitPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password }).unwrap();

      if (res?.mfaRequired) {
        setMfaToken(res.mfaToken);
        setStep("mfa");
        toast.info("We sent a 6-digit code to your email.");
        return;
      }

      dispatch(setCredentials({ ...res }));
      navigate(redirect);
    } catch (error) {
      toast.error(error?.data?.message || error?.error || "Unknown Error");
    }
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    try {
      const res = await verifyMfaUser({ mfaToken, code: mfaCode }).unwrap();
      dispatch(setCredentials({ ...res }));
      navigate(redirect);
    } catch (error) {
      toast.error(error?.data?.message || error?.error || "Invalid code");
    }
  };

  const loading = isLoggingIn || isVerifying || isGoogleLoading;

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

                <div className="mt-3 d-flex justify-content-center">
                  <div ref={googleBtnRef} />
                </div>

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
