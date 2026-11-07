import { useEffect, useState, type ReactElement } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  ColorSchemeToggle,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import {
  Download,
  FileText,
  History,
  ListChecks,
  ReceiptText,
  SlidersHorizontal,
  Users,
  UserRound,
} from "@wso2/oxygen-ui-icons-react";
import { Can, useAuthz } from "../authz/gates";
import { SCREEN_ROUTES } from "../authz/screens";
import { currentUser, signOut } from "../authz/session";
import { APP_NAME } from "../appName";

const NAV: ReadonlyArray<{ key: string; icon: ReactElement }> = [
  { key: "my-claims", icon: <ReceiptText size={18} /> },
  { key: "team-queue", icon: <ListChecks size={18} /> },
  { key: "team-decided", icon: <History size={18} /> },
  { key: "export", icon: <Download size={18} /> },
  { key: "export-history", icon: <FileText size={18} /> },
  { key: "categories", icon: <SlidersHorizontal size={18} /> },
  { key: "people", icon: <Users size={18} /> },
];

/** The app chrome. Navigation is the sidebar; every gated screen renders in the Outlet. */
export function AppShell(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { username } = useAuthz();
  const [email, setEmail] = useState("");

  useEffect(() => {
    void currentUser().then((u) => setEmail(u?.profile.email ?? ""));
  }, []);

  const active = SCREEN_ROUTES.find((s) => pathname === s.path || pathname.startsWith(`/${s.key}/`));

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <UserMenu>
              <UserMenu.Trigger name={username} />
              <UserMenu.Header name={username} email={email} />
              <UserMenu.Item
                icon={<UserRound size={16} />}
                label="Account"
                onClick={() => navigate("/account")}
              />
              <UserMenu.Divider />
              <UserMenu.Logout onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>
      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active?.key}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {NAV.map(({ key, icon }) => {
                const screen = SCREEN_ROUTES.find((s) => s.key === key)!;
                if (screen.loads === null) return null;
                return (
                  <Can key={key} op={screen.loads}>
                    <Sidebar.Item id={key} link={<Link to={screen.path} />}>
                      <Sidebar.ItemIcon>{icon}</Sidebar.ItemIcon>
                      <Sidebar.ItemLabel>{screen.label}</Sidebar.ItemLabel>
                    </Sidebar.Item>
                  </Can>
                );
              })}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>
      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>
      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
