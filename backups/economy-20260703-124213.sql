--
-- PostgreSQL database dump
--

\restrict jmdZmJPn1eJ3prPcgKP0YAg5YuSoKJal7Lc78ujL0Kmg3GRDdmDFpp0VMec4LOf

-- Dumped from database version 16.11
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    namn text NOT NULL,
    group_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    exclude_from_budget integer DEFAULT 0
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: bank_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_events (
    id integer NOT NULL,
    date text NOT NULL,
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    is_posted integer DEFAULT 0,
    transaction_id integer,
    import_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bank_events OWNER TO postgres;

--
-- Name: bank_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bank_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bank_events_id_seq OWNER TO postgres;

--
-- Name: bank_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bank_events_id_seq OWNED BY public.bank_events.id;


--
-- Name: booking_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.booking_templates (
    id integer NOT NULL,
    namn text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.booking_templates OWNER TO postgres;

--
-- Name: booking_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.booking_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.booking_templates_id_seq OWNER TO postgres;

--
-- Name: booking_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.booking_templates_id_seq OWNED BY public.booking_templates.id;


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budgets (
    id integer NOT NULL,
    account_id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budgets_month_check CHECK (((month >= 1) AND (month <= 12)))
);


ALTER TABLE public.budgets OWNER TO postgres;

--
-- Name: budgets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budgets_id_seq OWNER TO postgres;

--
-- Name: budgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.budgets_id_seq OWNED BY public.budgets.id;


--
-- Name: custom_result_view_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_result_view_accounts (
    id integer NOT NULL,
    view_id integer NOT NULL,
    account_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.custom_result_view_accounts OWNER TO postgres;

--
-- Name: custom_result_view_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.custom_result_view_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_result_view_accounts_id_seq OWNER TO postgres;

--
-- Name: custom_result_view_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.custom_result_view_accounts_id_seq OWNED BY public.custom_result_view_accounts.id;


--
-- Name: custom_result_view_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_result_view_groups (
    id integer NOT NULL,
    view_id integer NOT NULL,
    group_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.custom_result_view_groups OWNER TO postgres;

--
-- Name: custom_result_view_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.custom_result_view_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_result_view_groups_id_seq OWNER TO postgres;

--
-- Name: custom_result_view_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.custom_result_view_groups_id_seq OWNED BY public.custom_result_view_groups.id;


--
-- Name: custom_result_view_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_result_view_types (
    id integer NOT NULL,
    view_id integer NOT NULL,
    account_type character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT custom_result_view_types_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['Intäkt'::character varying, 'Utgift'::character varying, 'Tillgång'::character varying, 'Skuld'::character varying])::text[])))
);


ALTER TABLE public.custom_result_view_types OWNER TO postgres;

--
-- Name: custom_result_view_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.custom_result_view_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_result_view_types_id_seq OWNER TO postgres;

--
-- Name: custom_result_view_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.custom_result_view_types_id_seq OWNED BY public.custom_result_view_types.id;


--
-- Name: custom_result_views; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_result_views (
    id integer NOT NULL,
    namn character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.custom_result_views OWNER TO postgres;

--
-- Name: custom_result_views_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.custom_result_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_result_views_id_seq OWNER TO postgres;

--
-- Name: custom_result_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.custom_result_views_id_seq OWNED BY public.custom_result_views.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    namn text NOT NULL,
    typ text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT groups_typ_check CHECK ((typ = ANY (ARRAY['Intäkt'::text, 'Utgift'::text, 'Tillgång'::text, 'Skuld'::text])))
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imports (
    id integer NOT NULL,
    filename text NOT NULL,
    imported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total_events integer NOT NULL,
    date_range_start text NOT NULL,
    date_range_end text NOT NULL,
    account_id integer
);


ALTER TABLE public.imports OWNER TO postgres;

--
-- Name: imports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.imports_id_seq OWNER TO postgres;

--
-- Name: imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.imports_id_seq OWNED BY public.imports.id;


--
-- Name: period_locks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.period_locks (
    id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    locked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    locked_by text
);


ALTER TABLE public.period_locks OWNER TO postgres;

--
-- Name: period_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.period_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.period_locks_id_seq OWNER TO postgres;

--
-- Name: period_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.period_locks_id_seq OWNED BY public.period_locks.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    account_id integer NOT NULL,
    debet numeric(15,2) DEFAULT 0 NOT NULL,
    kredit numeric(15,2) DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT posts_check CHECK (((((debet)::double precision > (0)::double precision) AND ((kredit)::double precision = (0)::double precision)) OR (((kredit)::double precision > (0)::double precision) AND ((debet)::double precision = (0)::double precision)) OR (((debet)::double precision = (0)::double precision) AND ((kredit)::double precision = (0)::double precision))))
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: recurring_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recurring_items (
    id integer NOT NULL,
    namn text NOT NULL,
    expected_per_month integer DEFAULT 1 NOT NULL,
    active_months integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.recurring_items OWNER TO postgres;

--
-- Name: recurring_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recurring_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recurring_items_id_seq OWNER TO postgres;

--
-- Name: recurring_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recurring_items_id_seq OWNED BY public.recurring_items.id;


--
-- Name: template_rows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_rows (
    id integer NOT NULL,
    template_id integer NOT NULL,
    account_id integer NOT NULL,
    is_debet boolean NOT NULL,
    description text,
    row_order integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.template_rows OWNER TO postgres;

--
-- Name: template_rows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.template_rows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.template_rows_id_seq OWNER TO postgres;

--
-- Name: template_rows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.template_rows_id_seq OWNED BY public.template_rows.id;


--
-- Name: transaction_recurring_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_recurring_items (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    recurring_item_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.transaction_recurring_items OWNER TO postgres;

--
-- Name: transaction_recurring_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transaction_recurring_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_recurring_items_id_seq OWNER TO postgres;

--
-- Name: transaction_recurring_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transaction_recurring_items_id_seq OWNED BY public.transaction_recurring_items.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    date text NOT NULL,
    description text NOT NULL,
    bank_event_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    original_transaction_id integer,
    period_shift_date text,
    bridge_account_id integer
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: COLUMN transactions.original_transaction_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.transactions.original_transaction_id IS 'If this transaction is a period-shifted copy, this references the original transaction';


--
-- Name: COLUMN transactions.period_shift_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.transactions.period_shift_date IS 'The date this transaction should be accounted for (different from the bank event date)';


--
-- Name: COLUMN transactions.bridge_account_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.transactions.bridge_account_id IS 'The temporary account used to hold money between original and shifted period';


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: bank_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_events ALTER COLUMN id SET DEFAULT nextval('public.bank_events_id_seq'::regclass);


--
-- Name: booking_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_templates ALTER COLUMN id SET DEFAULT nextval('public.booking_templates_id_seq'::regclass);


--
-- Name: budgets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets ALTER COLUMN id SET DEFAULT nextval('public.budgets_id_seq'::regclass);


--
-- Name: custom_result_view_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_accounts ALTER COLUMN id SET DEFAULT nextval('public.custom_result_view_accounts_id_seq'::regclass);


--
-- Name: custom_result_view_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_groups ALTER COLUMN id SET DEFAULT nextval('public.custom_result_view_groups_id_seq'::regclass);


--
-- Name: custom_result_view_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_types ALTER COLUMN id SET DEFAULT nextval('public.custom_result_view_types_id_seq'::regclass);


--
-- Name: custom_result_views id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_views ALTER COLUMN id SET DEFAULT nextval('public.custom_result_views_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: imports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imports ALTER COLUMN id SET DEFAULT nextval('public.imports_id_seq'::regclass);


--
-- Name: period_locks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_locks ALTER COLUMN id SET DEFAULT nextval('public.period_locks_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: recurring_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_items ALTER COLUMN id SET DEFAULT nextval('public.recurring_items_id_seq'::regclass);


--
-- Name: template_rows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_rows ALTER COLUMN id SET DEFAULT nextval('public.template_rows_id_seq'::regclass);


--
-- Name: transaction_recurring_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_recurring_items ALTER COLUMN id SET DEFAULT nextval('public.transaction_recurring_items_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, namn, group_id, created_at, exclude_from_budget) FROM stdin;
1	Drivmedel	4	2025-12-22 21:31:26.128595	0
2	Försäkring	4	2025-12-22 21:31:32.303326	0
5	Försäkring	5	2025-12-22 21:31:59.669387	0
6	Mat och annat	5	2025-12-22 21:32:27.254656	0
7	Mat och hushållsartiklar	3	2025-12-22 21:32:36.67097	0
8	Service och underhåll	4	2025-12-22 21:32:46.689909	0
9	Gemensamt bankkort	1	2025-12-22 21:32:55.155326	0
10	Buffert	1	2025-12-22 21:33:15.533916	0
12	Semesterkassa	1	2025-12-22 21:34:23.348448	0
13	Lön	2	2025-12-22 21:37:31.115055	0
14	Prenumerationer	6	2025-12-22 22:09:44.879754	0
15	Resor	8	2025-12-22 22:13:36.998987	0
17	Välgörenhet	9	2025-12-22 22:17:15.586347	0
18	Övriga gåvor	9	2025-12-22 22:17:34.196177	0
19	Föreningsavgift	3	2025-12-22 22:22:58.299803	0
20	Bolåneränta	3	2025-12-22 22:23:08.645753	0
21	El	3	2025-12-22 22:24:38.634287	0
22	Sjukvård	10	2025-12-22 22:28:11.841728	0
23	Mobil	10	2025-12-22 22:28:27.346624	0
24	Inredning	3	2025-12-22 22:32:04.531772	0
25	Avbetalning	11	2025-12-22 22:36:34.0849	0
26	Facket och a-kassa	10	2025-12-22 22:56:35.882051	0
27	Bolån	12	2025-12-22 23:04:29.145904	0
28	Pension	13	2025-12-22 23:07:50.896394	0
11	Kontantinsats	13	2025-12-22 21:33:35.68831	0
29	Viktor	14	2025-12-22 23:13:02.938891	0
30	Emma	14	2025-12-22 23:13:09.807433	0
31	Utlägg och övrigt	14	2025-12-22 23:13:23.593172	0
32	Utekväll	6	2025-12-22 23:14:17.529262	0
33	Viktor	15	2025-12-22 23:22:40.800741	0
34	Emma	15	2025-12-22 23:22:45.990242	0
35	Övriga kostnader	16	2025-12-22 23:27:58.43292	0
36	Veterinär	5	2025-12-22 23:35:22.433203	0
37	Gemensamt spar	1	2025-12-22 23:58:28.864341	0
38	Försäkringar	10	2025-12-23 00:01:27.211075	0
16	Snabbmat, lunch och fika	6	2025-12-22 22:15:38.265748	0
41	Övriga kostnader	4	2025-12-23 09:42:16.950914	0
40	Parkering och trängselskatt	4	2025-12-23 09:42:05.920937	0
42	Ränteintäkter	2	2025-12-23 23:45:27.444007	0
43	Ingående balans	2	2025-12-23 23:46:58.258504	0
44	Gåvor	2	2025-12-29 14:34:24.870419	0
45	Mellankonto för periodiseringar etc	17	2026-01-01 17:33:20.72817	0
46	Skatt	4	2026-01-01 21:00:17.131908	0
47	Försäkring	3	2026-01-02 14:25:18.423472	0
48	Fordringar	17	2026-01-02 17:42:31.780706	0
49	Uppbokat	1	2026-01-11 12:06:01.24222	0
50	Reserverade pengar	15	2026-01-23 10:18:22.917403	0
\.


--
-- Data for Name: bank_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_events (id, date, description, amount, is_posted, transaction_id, import_id, created_at) FROM stdin;
2	2025-12-22T00:00:00.000Z	I00000375579	26475.00	1	2	1	2025-12-22 21:27:40.035492
5	2025-12-19T00:00:00.000Z	Maxi Ica Storm Gnist	-318.41	1	4	1	2025-12-22 21:27:40.035492
4	2025-12-19T00:00:00.000Z	Apotek Hjärtat Ica M	-187.00	1	5	1	2025-12-22 21:27:40.035492
8	2025-12-17T00:00:00.000Z	Ica Kvantum	-55.00	1	6	1	2025-12-22 21:27:40.035492
16	2025-12-12T00:00:00.000Z	Netflix.Com	-109.00	1	7	1	2025-12-22 21:27:40.035492
9	2025-12-17T00:00:00.000Z	Ica Kvantum	-61.00	1	8	1	2025-12-22 21:27:40.035492
10	2025-12-15T00:00:00.000Z	Willys Uppsala Bjork	-560.14	1	9	1	2025-12-22 21:27:40.035492
11	2025-12-15T00:00:00.000Z	Ica Årstahallen	-70.90	1	10	1	2025-12-22 21:27:40.035492
13	2025-12-13T00:00:00.000Z	Ica Årstahallen	-92.90	1	11	1	2025-12-22 21:27:40.035492
14	2025-12-12T00:00:00.000Z	Ul Kollektivtr	-39.00	1	12	1	2025-12-22 21:27:40.035492
15	2025-12-12T00:00:00.000Z	Ica Kvantum	-19.00	1	14	1	2025-12-22 21:27:40.035492
18	2025-12-08T00:00:00.000Z	Willys Uppsala Bjork	-882.38	1	15	1	2025-12-22 21:27:40.035492
19	2025-12-07T00:00:00.000Z	Maxi Ica Storm Gnist	-156.70	1	16	1	2025-12-22 21:27:40.035492
23	2025-12-06T00:00:00.000Z	Ica Årstahallen	-98.80	1	17	1	2025-12-22 21:27:40.035492
24	2025-12-06T00:00:00.000Z	Ica Årstahallen	-38.50	1	18	1	2025-12-22 21:27:40.035492
22	2025-12-06T00:00:00.000Z	Circle K Uppsala Rapsg	-40.00	1	19	1	2025-12-22 21:27:40.035492
21	2025-12-06T00:00:00.000Z	Biltema Sweden Uppsala	-64.70	1	20	1	2025-12-22 21:27:40.035492
27	2025-12-05T00:00:00.000Z	Ragusa	-405.00	1	21	1	2025-12-22 21:27:40.035492
28	2025-12-05T00:00:00.000Z	Willys Uppsala Bjork	-234.50	1	23	1	2025-12-22 21:27:40.035492
29	2025-12-04T00:00:00.000Z	Ica Kvantum	-99.00	1	24	1	2025-12-22 21:27:40.035492
32	2025-12-03T00:00:00.000Z	Maxi Ica Storm Gnist	-676.55	1	25	1	2025-12-22 21:27:40.035492
33	2025-12-02T00:00:00.000Z	Spotify P3d038657a	-189.00	1	26	1	2025-12-22 21:27:40.035492
43	2025-12-01T00:00:00.000Z	Lf Uppsala	-151.00	1	27	1	2025-12-22 21:27:40.035492
41	2025-12-01T00:00:00.000Z	Lf Uppsala	-141.00	1	28	1	2025-12-22 21:27:40.035492
44	2025-11-30T00:00:00.000Z	Sl App	-43.00	1	29	1	2025-12-22 21:27:40.035492
46	2025-11-29T00:00:00.000Z	Sl App	-43.00	1	30	1	2025-12-22 21:27:40.035492
34	2025-12-01T00:00:00.000Z	Okq8	-600.61	1	31	1	2025-12-22 21:27:40.035492
42	2025-12-01T00:00:00.000Z	Folktandvård	-72.00	1	32	1	2025-12-22 21:27:40.035492
40	2025-12-01T00:00:00.000Z	Sbab	-282.00	1	33	1	2025-12-22 21:27:40.035492
35	2025-12-01T00:00:00.000Z	Stora Coop Bolanderna	-38.95	1	35	1	2025-12-22 21:27:40.035492
45	2025-11-29T00:00:00.000Z	Sanai Blommer Kb	-125.00	1	36	1	2025-12-22 21:27:40.035492
37	2025-12-01T00:00:00.000Z	Kronans Apotek Ab	-44.70	1	37	1	2025-12-22 21:27:40.035492
51	2025-11-28T00:00:00.000Z	Jysk Bolanderna	-50.00	1	38	1	2025-12-22 21:27:40.035492
47	2025-11-28T00:00:00.000Z	Ikea Uppsala Hfb Eco	-1194.00	1	39	1	2025-12-22 21:27:40.035492
53	2025-11-28T00:00:00.000Z	Csn	-1520.00	1	40	1	2025-12-22 21:27:40.035492
48	2025-11-28T00:00:00.000Z	Willys Uppsala Bjork	-409.70	1	41	1	2025-12-22 21:27:40.035492
49	2025-11-28T00:00:00.000Z	Rusta - 7 Uppsala Bola	-457.10	1	42	1	2025-12-22 21:27:40.035492
52	2025-11-28T00:00:00.000Z	Comviq.Se	-428.00	1	44	1	2025-12-22 21:27:40.035492
56	2025-11-28T00:00:00.000Z	Ica Försäkr	-642.00	1	45	1	2025-12-22 21:27:40.035492
54	2025-11-28T00:00:00.000Z	Fastum Ubc	-3998.00	1	46	1	2025-12-22 21:27:40.035492
55	2025-11-28T00:00:00.000Z	Union.Akassa	-160.00	1	47	1	2025-12-22 21:27:40.035492
59	2025-11-28T00:00:00.000Z	Union.Akassa	-160.00	1	48	1	2025-12-22 21:27:40.035492
57	2025-11-28T00:00:00.000Z	Wspa Sverige	-300.00	1	49	1	2025-12-22 21:27:40.035492
58	2025-11-28T00:00:00.000Z	Unionen	-235.00	1	50	1	2025-12-22 21:27:40.035492
62	2025-11-27T00:00:00.000Z	Ammortering	-16000.00	1	51	1	2025-12-22 21:27:40.035492
65	2025-11-26T00:00:00.000Z	Ica Kvantum	-114.60	1	52	1	2025-12-22 21:27:40.035492
75	2025-11-25T00:00:00.000Z	I00000371748	32661.00	1	53	1	2025-12-22 21:27:40.035492
60	2025-11-28T00:00:00.000Z	Återbet Buffert	-10000.00	1	55	1	2025-12-22 21:27:40.035492
74	2025-11-25T00:00:00.000Z	Avanza Bank	-1000.00	1	56	1	2025-12-22 21:27:40.035492
72	2025-11-25T00:00:00.000Z	Överföring	-7800.00	1	57	1	2025-12-22 21:27:40.035492
30	2025-12-03T00:00:00.000Z	Biltema Sweden Uppsala	-298.90	1	58	1	2025-12-22 21:27:40.035492
63	2025-11-27T00:00:00.000Z	Agria	-259.00	1	59	1	2025-12-22 21:27:40.035492
73	2025-11-25T00:00:00.000Z	Avanza Bank	-1000.00	1	60	1	2025-12-22 21:27:40.035492
82	2025-11-23T00:00:00.000Z	Maxi Ica Storm Gnist	-430.44	1	61	1	2025-12-22 21:27:40.035492
83	2025-11-22T00:00:00.000Z	Loomisp Harrys Uppsala	-195.00	1	76	1	2025-12-22 21:27:40.035492
12	2025-12-15T00:00:00.000Z	Överföring Till Ica Banks Konto	2500.00	1	82	1	2025-12-22 21:27:40.035492
6	2025-12-19T00:00:00.000Z	Överföring Till Ica Banks Konto	1000.00	1	83	1	2025-12-22 21:27:40.035492
7	2025-12-19T00:00:00.000Z	Överföring	-1800.00	1	84	1	2025-12-22 21:27:40.035492
25	2025-12-06T00:00:00.000Z	Överföring Till Ica Banks Konto	1231.29	1	85	1	2025-12-22 21:27:40.035492
61	2025-11-27T00:00:00.000Z	Överföring	-704.00	1	86	1	2025-12-22 21:27:40.035492
84	2025-11-22T00:00:00.000Z	Biltema Sweden Uppsala	-563.60	1	89	1	2025-12-22 21:27:40.035492
39	2025-12-01T00:00:00.000Z	Vattenfall	-556.84	1	148	1	2025-12-22 21:27:40.035492
64	2025-11-26T00:00:00.000Z	Dryck & Mat I U	-810.00	1	149	1	2025-12-22 21:27:40.035492
80	2025-11-23T00:00:00.000Z	Max Burgers 2010135 Ki	-351.00	1	151	1	2025-12-22 21:27:40.035492
79	2025-11-23T00:00:00.000Z	Loopia Ab	-11.25	1	152	1	2025-12-22 21:27:40.035492
81	2025-11-23T00:00:00.000Z	Loomisp Harrys Uppsala	-195.00	1	153	1	2025-12-22 21:27:40.035492
36	2025-12-01T00:00:00.000Z	Loopia Ab	-11.25	1	154	1	2025-12-22 21:27:40.035492
31	2025-12-03T00:00:00.000Z	Systembolaget	-239.00	1	182	1	2025-12-22 21:27:40.035492
67	2025-11-26T00:00:00.000Z	Avgift Bankkort	-35.00	1	183	1	2025-12-22 21:27:40.035492
66	2025-11-26T00:00:00.000Z	Avgift Bankkort	-35.00	1	184	1	2025-12-22 21:27:40.035492
20	2025-12-07T00:00:00.000Z	Överföring Till Ica Banks Konto	250.00	1	185	1	2025-12-22 21:27:40.035492
69	2025-11-25T00:00:00.000Z	Överföring	-700.00	1	186	1	2025-12-22 21:27:40.035492
68	2025-11-25T00:00:00.000Z	Överföring	-70.00	1	187	1	2025-12-22 21:27:40.035492
70	2025-11-25T00:00:00.000Z	Överföring	-461.29	1	188	1	2025-12-22 21:27:40.035492
78	2025-11-23T00:00:00.000Z	Loopia Ab	-323.75	1	189	1	2025-12-22 21:27:40.035492
77	2025-11-24T00:00:00.000Z	Överföring Till Ica Banks Konto	323.00	1	190	1	2025-12-22 21:27:40.035492
86	2025-11-22T00:00:00.000Z	Stora Coop Bolanderna	-102.95	1	63	1	2025-12-22 21:27:40.035492
88	2025-11-22T00:00:00.000Z	Loomisp Harrys Uppsala	-120.00	1	64	1	2025-12-22 21:27:40.035492
95	2025-11-17T00:00:00.000Z	Maxi Ica Storm Gnist	-721.92	1	65	1	2025-12-22 21:27:40.035492
94	2025-11-17T00:00:00.000Z	Zoo.Se Uppsala	-407.05	1	66	1	2025-12-22 21:27:40.035492
92	2025-11-21T00:00:00.000Z	Ul Kollektivtr	-39.00	1	67	1	2025-12-22 21:27:40.035492
97	2025-11-15T00:00:00.000Z	Loomisp Harrys Uppsala	-79.00	1	69	1	2025-12-22 21:27:40.035492
100	2025-11-14T00:00:00.000Z	Vastmanland-Dal	-99.00	1	70	1	2025-12-22 21:27:40.035492
98	2025-11-15T00:00:00.000Z	Vastmanland-Dal	-99.00	1	71	1	2025-12-22 21:27:40.035492
99	2025-11-15T00:00:00.000Z	Cherry Konfektyr	-45.00	1	72	1	2025-12-22 21:27:40.035492
96	2025-11-15T00:00:00.000Z	Loomisp Harrys Uppsala	-260.00	1	73	1	2025-12-22 21:27:40.035492
102	2025-11-13T00:00:00.000Z	Prostatacancerfoerbund	-5.00	1	74	1	2025-12-22 21:27:40.035492
104	2025-11-13T00:00:00.000Z	Maxi Ica Storm Gnist	-658.80	1	75	1	2025-12-22 21:27:40.035492
106	2025-11-12T00:00:00.000Z	Netflix.Com	-109.00	1	77	1	2025-12-22 21:27:40.035492
107	2025-11-11T00:00:00.000Z	Willys Uppsala Bjork	-359.54	1	78	1	2025-12-22 21:27:40.035492
103	2025-11-13T00:00:00.000Z	Apoteket Bolaenderna	-2863.50	1	80	1	2025-12-22 21:27:40.035492
110	2025-11-10T00:00:00.000Z	Överföring Till Ica Banks Konto	5000.00	1	87	1	2025-12-22 21:27:40.035492
105	2025-11-13T00:00:00.000Z	Överföring Till Ica Banks Konto	5000.00	1	88	1	2025-12-22 21:27:40.035492
124	2025-11-05T00:00:00.000Z	Willys Uppsala Bjork	-109.32	1	90	1	2025-12-22 21:27:40.035492
134	2025-11-03T00:00:00.000Z	Lf Uppsala	-141.00	1	91	1	2025-12-22 21:27:40.035492
122	2025-11-05T00:00:00.000Z	Sl App	-82.00	1	92	1	2025-12-22 21:27:40.035492
123	2025-11-05T00:00:00.000Z	Sl App	-82.00	1	93	1	2025-12-22 21:27:40.035492
127	2025-11-03T00:00:00.000Z	Sl App	-82.00	1	94	1	2025-12-22 21:27:40.035492
133	2025-11-03T00:00:00.000Z	Lf Uppsala	-151.00	1	95	1	2025-12-22 21:27:40.035492
130	2025-11-03T00:00:00.000Z	Ica Årstahallen	-400.54	1	96	1	2025-12-22 21:27:40.035492
125	2025-11-03T00:00:00.000Z	Ul Kollektivtr	-82.00	1	97	1	2025-12-22 21:27:40.035492
128	2025-11-03T00:00:00.000Z	Sl App	-82.00	1	98	1	2025-12-22 21:27:40.035492
135	2025-11-02T00:00:00.000Z	Spotify P3c0d2419b	-189.00	1	100	1	2025-12-22 21:27:40.035492
136	2025-11-01T00:00:00.000Z	Willys Uppsala Bjork	-1056.75	1	101	1	2025-12-22 21:27:40.035492
143	2025-10-31T00:00:00.000Z	Unionen	-235.00	1	102	1	2025-12-22 21:27:40.035492
141	2025-10-31T00:00:00.000Z	Fastum Ubc	-3998.00	1	103	1	2025-12-22 21:27:40.035492
138	2025-10-31T00:00:00.000Z	Ica Årstahallen	-356.55	1	104	1	2025-12-22 21:27:40.035492
142	2025-10-31T00:00:00.000Z	Csn	-1520.00	1	105	1	2025-12-22 21:27:40.035492
147	2025-10-30T00:00:00.000Z	Sbab	-1455.00	1	106	1	2025-12-22 21:27:40.035492
149	2025-10-30T00:00:00.000Z	Sbab	-351.00	1	107	1	2025-12-22 21:27:40.035492
145	2025-10-30T00:00:00.000Z	Malardalstrafik Ab	-85.00	1	108	1	2025-12-22 21:27:40.035492
152	2025-10-28T00:00:00.000Z	Union.Akassa	-160.00	1	110	1	2025-12-22 21:27:40.035492
155	2025-10-28T00:00:00.000Z	Wspa Sverige	-300.00	1	111	1	2025-12-22 21:27:40.035492
151	2025-10-28T00:00:00.000Z	Faboden	-441.00	1	112	1	2025-12-22 21:27:40.035492
146	2025-10-30T00:00:00.000Z	Ica Kvantum	-49.00	1	113	1	2025-12-22 21:27:40.035492
132	2025-11-03T00:00:00.000Z	Nytt Körkort	-375.00	1	114	1	2025-12-22 21:27:40.035492
148	2025-10-30T00:00:00.000Z	Trängselskat	-11.00	1	115	1	2025-12-22 21:27:40.035492
144	2025-10-30T00:00:00.000Z	Coop Stationsgallerian	-69.90	1	116	1	2025-12-22 21:27:40.035492
156	2025-10-28T00:00:00.000Z	Pension Och Snabbmat	-1270.00	1	117	1	2025-12-22 21:27:40.035492
154	2025-10-28T00:00:00.000Z	Union.Akassa	-160.00	1	118	1	2025-12-22 21:27:40.035492
153	2025-10-28T00:00:00.000Z	Ica Försäkr	-639.00	1	119	1	2025-12-22 21:27:40.035492
157	2025-10-27T00:00:00.000Z	Ul Kollektivtr	-29.00	1	120	1	2025-12-22 21:27:40.035492
162	2025-10-27T00:00:00.000Z	Agria	-259.00	1	121	1	2025-12-22 21:27:40.035492
161	2025-10-27T00:00:00.000Z	Avanza Bank	-1000.00	1	131	1	2025-12-22 21:27:40.035492
167	2025-10-25T00:00:00.000Z	Ica Årstahallen	-185.57	1	132	1	2025-12-22 21:27:40.035492
101	2025-11-13T00:00:00.000Z	Mcduppsalafyrislund	-305.00	1	150	1	2025-12-22 21:27:40.035492
115	2025-11-09T00:00:00.000Z	St1 Ploq Nykopingsbro	-115.00	1	155	1	2025-12-22 21:27:40.035492
113	2025-11-09T00:00:00.000Z	Mangal Jonkoping	-159.00	1	156	1	2025-12-22 21:27:40.035492
114	2025-11-09T00:00:00.000Z	St1 Valkommen In Jonko	-84.00	1	157	1	2025-12-22 21:27:40.035492
116	2025-11-09T00:00:00.000Z	Chopchop Jonkop	-264.00	1	158	1	2025-12-22 21:27:40.035492
121	2025-11-06T00:00:00.000Z	Max Burgers 2010053 Ec	-290.00	1	159	1	2025-12-22 21:27:40.035492
119	2025-11-06T00:00:00.000Z	Preem	-191.00	1	160	1	2025-12-22 21:27:40.035492
118	2025-11-06T00:00:00.000Z	St1 Ploq Norsborg S T	-261.00	1	162	1	2025-12-22 21:27:40.035492
140	2025-10-31T00:00:00.000Z	Överföring Till Ica Banks Konto	4943.20	1	163	1	2025-12-22 21:27:40.035492
159	2025-10-27T00:00:00.000Z	Ica Årstahallen	-357.72	1	164	1	2025-12-22 21:27:40.035492
160	2025-10-27T00:00:00.000Z	Amortering	-30000.00	1	165	1	2025-12-22 21:27:40.035492
163	2025-10-26T00:00:00.000Z	Willys Uppsala Bjork	-207.83	1	166	1	2025-12-22 21:27:40.035492
129	2025-11-03T00:00:00.000Z	Pressbyran 4308650	-40.00	1	167	1	2025-12-22 21:27:40.035492
112	2025-11-09T00:00:00.000Z	St1 Valkommen In Jonko	-82.00	1	168	1	2025-12-22 21:27:40.035492
164	2025-10-25T00:00:00.000Z	Zoo.Se Uppsala	-203.30	1	169	1	2025-12-22 21:27:40.035492
158	2025-10-27T00:00:00.000Z	Ul Kollektivtr	-29.00	1	170	1	2025-12-22 21:27:40.035492
166	2025-10-25T00:00:00.000Z	Max Burgers 2010069 Ec	-146.00	1	172	1	2025-12-22 21:27:40.035492
169	2025-10-24T00:00:00.000Z	Selecta Ab	-34.00	1	175	1	2025-12-22 21:27:40.035492
90	2025-11-22T00:00:00.000Z	Överföring	-500.00	1	191	1	2025-12-22 21:27:40.035492
91	2025-11-22T00:00:00.000Z	Överföring	-323.00	1	193	1	2025-12-22 21:27:40.035492
111	2025-11-10T00:00:00.000Z	Överföring Till Ica Banks Konto	250.00	1	194	1	2025-12-22 21:27:40.035492
117	2025-11-09T00:00:00.000Z	Överföring	-550.00	1	195	1	2025-12-22 21:27:40.035492
137	2025-10-31T00:00:00.000Z	Lager 157 Uppsa	450.00	1	196	1	2025-12-22 21:27:40.035492
165	2025-10-25T00:00:00.000Z	Lager 157 Uppsa	-450.00	1	198	1	2025-12-22 21:27:40.035492
150	2025-10-29T00:00:00.000Z	Vinted  Uab	-176.59	1	199	1	2025-12-22 21:27:40.035492
139	2025-10-31T00:00:00.000Z	Överföring	-300.00	1	215	1	2025-12-22 21:27:40.035492
108	2025-11-11T00:00:00.000Z	Överföring	-300.00	1	216	1	2025-12-22 21:27:40.035492
1	2025-12-22T00:00:00.000Z	I00000375436	33181.00	1	1	1	2025-12-22 21:27:40.035492
3	2025-12-20T00:00:00.000Z	Ica Årstahallen	-92.40	1	3	1	2025-12-22 21:27:40.035492
17	2025-12-11T00:00:00.000Z	Ul Kollektivtr	-39.00	1	13	1	2025-12-22 21:27:40.035492
26	2025-12-05T00:00:00.000Z	Hemkop Uppsala Svava	-64.07	1	22	1	2025-12-22 21:27:40.035492
38	2025-12-01T00:00:00.000Z	Sbab	-1455.00	1	34	1	2025-12-22 21:27:40.035492
50	2025-11-28T00:00:00.000Z	Jysk Bolanderna	-550.00	1	43	1	2025-12-22 21:27:40.035492
76	2025-11-25T00:00:00.000Z	I00000371779	26909.00	1	54	1	2025-12-22 21:27:40.035492
87	2025-11-22T00:00:00.000Z	Prostatacancerforbund	-500.00	1	62	1	2025-12-22 21:27:40.035492
93	2025-11-21T00:00:00.000Z	Ul Kollektivtr	-39.00	1	68	1	2025-12-22 21:27:40.035492
109	2025-11-10T00:00:00.000Z	Ica Årstahallen	-760.72	1	79	1	2025-12-22 21:27:40.035492
71	2025-11-25T00:00:00.000Z	Överföring	-5000.00	1	81	1	2025-12-22 21:27:40.035492
126	2025-11-03T00:00:00.000Z	Ul Kollektivtr	-82.00	1	99	1	2025-12-22 21:27:40.035492
131	2025-11-03T00:00:00.000Z	41313008 Vattenfall Kundservice Ab	-444.32	1	109	1	2025-12-22 21:27:40.035492
175	2025-10-24T00:00:00.000Z	I00000368238	28044.00	1	122	1	2025-12-22 21:27:40.035492
174	2025-10-24T00:00:00.000Z	Överföring Till Ica Banks Konto	33369.00	1	123	1	2025-12-22 21:27:40.035492
168	2025-10-24T00:00:00.000Z	Willys Uppsala Granb	-115.60	1	124	1	2025-12-22 21:27:40.035492
181	2025-10-21T00:00:00.000Z	Maxi Ica Stormarknad Sten	89.70	1	125	1	2025-12-22 21:27:40.035492
180	2025-10-21T00:00:00.000Z	Maxi Ica Storm Stenh	-112.85	1	126	1	2025-12-22 21:27:40.035492
182	2025-10-20T00:00:00.000Z	Ica Årstahallen	-76.69	1	127	1	2025-12-22 21:27:40.035492
184	2025-10-19T00:00:00.000Z	Maxi Ica Storm Gnist	-299.50	1	128	1	2025-12-22 21:27:40.035492
185	2025-10-18T00:00:00.000Z	Okq8	-1154.91	1	129	1	2025-12-22 21:27:40.035492
189	2025-10-17T00:00:00.000Z	Zoo.Se Uppsala	-458.00	1	130	1	2025-12-22 21:27:40.035492
173	2025-10-24T00:00:00.000Z	Överföring	-7000.00	1	133	1	2025-12-22 21:27:40.035492
172	2025-10-24T00:00:00.000Z	Överföring	-7000.00	1	134	1	2025-12-22 21:27:40.035492
194	2025-10-14T00:00:00.000Z	W Meds.Se	-358.49	1	135	1	2025-12-22 21:27:40.035492
195	2025-10-14T00:00:00.000Z	Maxi Ica Storm Stenh	-1276.45	1	136	1	2025-12-22 21:27:40.035492
197	2025-10-12T00:00:00.000Z	Ica Årstahallen	-134.95	1	137	1	2025-12-22 21:27:40.035492
199	2025-10-11T00:00:00.000Z	Ica Årstahallen	-233.83	1	138	1	2025-12-22 21:27:40.035492
198	2025-10-11T00:00:00.000Z	Blomsterlandet	-437.80	1	139	1	2025-12-22 21:27:40.035492
204	2025-10-10T00:00:00.000Z	Albellise Onskefoto	-846.16	1	140	1	2025-12-22 21:27:40.035492
205	2025-10-10T00:00:00.000Z	Ica Årstahallen	-247.55	1	141	1	2025-12-22 21:27:40.035492
201	2025-10-10T00:00:00.000Z	Polisen 0301 Up	-1000.00	1	142	1	2025-12-22 21:27:40.035492
207	2025-10-07T00:00:00.000Z	Ica Årstahallen	-160.90	1	143	1	2025-12-22 21:27:40.035492
202	2025-10-10T00:00:00.000Z	Granngarden Uppsala 42	-229.00	1	144	1	2025-12-22 21:27:40.035492
208	2025-10-06T00:00:00.000Z	Ica Årstahallen	-303.07	1	145	1	2025-12-22 21:27:40.035492
211	2025-10-04T00:00:00.000Z	Norrlands Natio	-98.00	1	146	1	2025-12-22 21:27:40.035492
191	2025-10-17T00:00:00.000Z	Google One	-159.00	1	147	1	2025-12-22 21:27:40.035492
120	2025-11-06T00:00:00.000Z	Maxi Ica Storm Gnist	-209.40	1	161	1	2025-12-22 21:27:40.035492
85	2025-11-22T00:00:00.000Z	Circle K Uppsala Rapsg	-40.00	1	171	1	2025-12-22 21:27:40.035492
170	2025-10-24T00:00:00.000Z	Överföring	-3443.20	1	173	1	2025-12-22 21:27:40.035492
176	2025-10-23T00:00:00.000Z	Max Burgers 2010053 Ec	-192.00	1	174	1	2025-12-22 21:27:40.035492
178	2025-10-22T00:00:00.000Z	Pressbyran 4308139	-45.00	1	176	1	2025-12-22 21:27:40.035492
186	2025-10-18T00:00:00.000Z	Mcduppsalafyrislund	-212.00	1	177	1	2025-12-22 21:27:40.035492
196	2025-10-13T00:00:00.000Z	Mcduppsalafyrislund	-144.00	1	178	1	2025-12-22 21:27:40.035492
209	2025-10-05T00:00:00.000Z	Xl Grillen	-240.00	1	179	1	2025-12-22 21:27:40.035492
212	2025-10-04T00:00:00.000Z	Pressbyran 4408657	-96.00	1	180	1	2025-12-22 21:27:40.035492
203	2025-10-10T00:00:00.000Z	Easypark	-22.25	1	181	1	2025-12-22 21:27:40.035492
89	2025-11-22T00:00:00.000Z	Överföring Till Ica Banks Konto	500.00	1	192	1	2025-12-22 21:27:40.035492
177	2025-10-22T00:00:00.000Z	Lager 157 Uppsa	-450.00	1	197	1	2025-12-22 21:27:40.035492
179	2025-10-21T00:00:00.000Z	Cafe Cups	-139.00	1	200	1	2025-12-22 21:27:40.035492
183	2025-10-19T00:00:00.000Z	Biltema Sweden Uppsala	-24.90	1	201	1	2025-12-22 21:27:40.035492
187	2025-10-18T00:00:00.000Z	Biltema Sweden Uppsala	-59.90	1	202	1	2025-12-22 21:27:40.035492
192	2025-10-16T00:00:00.000Z	Partykungen.Se	-1199.70	1	203	1	2025-12-22 21:27:40.035492
190	2025-10-17T00:00:00.000Z	Adlibris.Se	-349.00	1	204	1	2025-12-22 21:27:40.035492
188	2025-10-18T00:00:00.000Z	Överföring Till Ica Banks Konto	220.00	1	205	1	2025-12-22 21:27:40.035492
206	2025-10-08T00:00:00.000Z	Arsta Travcafe	-86.00	1	206	1	2025-12-22 21:27:40.035492
200	2025-10-10T00:00:00.000Z	Biltema Sweden Uppsala	-70.00	1	207	1	2025-12-22 21:27:40.035492
214	2025-12-23T00:00:00.000Z	Zoo.Se Uppsala         Uppsala        Se	-662.00	1	208	2	2025-12-23 23:32:49.38132
215	2025-12-23T00:00:00.000Z	Fäboden                Uppsala        Se	-736.00	1	209	2	2025-12-23 23:32:49.38132
216	2025-12-23T00:00:00.000Z	Maxi Ica Stormarknad Sten	-1250.98	1	210	2	2025-12-23 23:32:49.38132
217	2025-12-23T00:00:00.000Z	Maxi Ica Stormarknad Sten	-105.95	1	211	2	2025-12-23 23:32:49.38132
218	2025-12-23T00:00:00.000Z	Återbet Buffert	-2500.00	1	212	2	2025-12-23 23:32:49.38132
213	2025-10-03T00:00:00.000Z	Överföring Till Ica Banks Konto	15000.00	1	213	1	2025-12-22 21:27:40.035492
193	2025-10-15T00:00:00.000Z	Överföring	-1855.00	1	214	1	2025-12-22 21:27:40.035492
210	2025-10-05T00:00:00.000Z	Postnord	-769.60	1	219	1	2025-12-22 21:27:40.035492
171	2025-10-24T00:00:00.000Z	Överföring	-738.00	1	220	1	2025-12-22 21:27:40.035492
452	2025-12-29T00:00:00.000Z	Avanza Bank	-1000.00	1	238	5	2025-12-29 14:57:51.853511
454	2025-12-29T00:00:00.000Z	Agria	-297.00	1	240	5	2025-12-29 14:57:51.853511
455	2025-12-29T00:00:00.000Z	Union.Akassa	-160.00	1	241	5	2025-12-29 14:57:51.853511
456	2025-12-29T00:00:00.000Z	Union.Akassa	-160.00	1	242	5	2025-12-29 14:57:51.853511
457	2025-12-29T00:00:00.000Z	Comviq.Se              Kista          Se	-428.00	1	243	5	2025-12-29 14:57:51.853511
460	2025-12-28T00:00:00.000Z	Loopia Ab	-348.75	1	244	5	2025-12-29 14:57:51.853511
465	2025-12-27T00:00:00.000Z	Överföring	-14000.00	1	245	5	2025-12-29 14:57:51.853511
464	2025-12-27T00:00:00.000Z	Överföring Till Ica Banks Konto	14000.00	1	246	5	2025-12-29 14:57:51.853511
463	2025-12-27T00:00:00.000Z	Överföring	-14000.00	1	247	5	2025-12-29 14:57:51.853511
451	2025-12-29T00:00:00.000Z	Avanza Bank	-1000.00	1	248	5	2025-12-29 14:57:51.853511
458	2025-12-29T00:00:00.000Z	Avgift Bankkort	-35.00	1	249	5	2025-12-29 14:57:51.853511
461	2025-12-28T00:00:00.000Z	Ica Årstahallen	-438.63	1	251	5	2025-12-29 14:57:51.853511
450	2025-12-29T00:00:00.000Z	Överföring Till Ica Banks Konto	19277.00	1	252	5	2025-12-29 14:57:51.853511
462	2025-12-27T00:00:00.000Z	Överföring	-19346.00	1	253	5	2025-12-29 14:57:51.853511
449	2025-12-29T00:00:00.000Z	Överföring	-1000.00	1	254	5	2025-12-29 14:57:51.853511
453	2025-12-29T00:00:00.000Z	Wspa Sverige	-300.00	1	239	5	2025-12-29 14:57:51.853511
559	2026-02-03T00:00:00.000Z	Maxi Ica Storm Gnist	-388.70	1	351	15	2026-02-04 16:07:12.194799
564	2026-02-02T00:00:00.000Z	Lf Uppsala	-141.00	1	352	15	2026-02-04 16:07:12.194799
566	2026-02-02T00:00:00.000Z	Lf Uppsala	-151.00	1	353	15	2026-02-04 16:07:12.194799
565	2026-02-02T00:00:00.000Z	Folktandvård	-72.00	1	354	15	2026-02-04 16:07:12.194799
561	2026-02-02T00:00:00.000Z	Ica Årstahallen	-62.45	1	355	15	2026-02-04 16:07:12.194799
560	2026-02-02T00:00:00.000Z	Spotify P3ef8be999	-189.00	1	356	15	2026-02-04 16:07:12.194799
562	2026-02-02T00:00:00.000Z	Ica Årstahallen	-400.20	1	357	15	2026-02-04 16:07:12.194799
488	2026-01-01T00:00:00.000Z	Loopia Ab              Västerås       Se	-11.25	1	260	8	2026-01-01 14:16:11.701127
489	2025-12-31T00:00:00.000Z	Erhållen Ränta	5.42	1	261	8	2026-01-01 14:16:11.701127
491	2025-12-30T00:00:00.000Z	Maxi Ica Stormarknad Gnis	-1263.02	1	262	8	2026-01-01 14:16:11.701127
492	2025-12-30T00:00:00.000Z	Fastum Ubc	-4074.00	1	263	8	2026-01-01 14:16:11.701127
498	2025-12-30T00:00:00.000Z	Sbab	-19000.00	1	264	8	2026-01-01 14:16:11.701127
567	2026-02-01T00:00:00.000Z	Loopia Ab	-12.49	1	358	15	2026-02-04 16:07:12.194799
568	2026-01-31T00:00:00.000Z	Ica Årstahallen	-487.80	1	362	15	2026-02-04 16:07:12.194799
494	2025-12-30T00:00:00.000Z	Csn	-1513.00	1	269	8	2026-01-01 14:16:11.701127
495	2025-12-30T00:00:00.000Z	Ica Försäkr	-639.00	1	270	8	2026-01-01 14:16:11.701127
490	2025-12-30T00:00:00.000Z	Systembolaget	-257.00	1	271	8	2026-01-01 14:16:11.701127
496	2025-12-30T00:00:00.000Z	Unionen	-235.00	1	272	8	2026-01-01 14:16:11.701127
563	2026-02-02T00:00:00.000Z	Vattenfall	-628.40	1	380	15	2026-02-04 16:07:12.194799
557	2026-02-04T00:00:00.000Z	Okq8 Uppsala Valsatra  Uppsala        Se	-139.00	1	401	15	2026-02-04 16:07:12.194799
497	2025-12-30T00:00:00.000Z	Sbab	-237.00	1	278	8	2026-01-01 14:16:11.701127
558	2026-02-03T00:00:00.000Z	Rusta - 7 Uppsala Bola	-406.30	1	402	15	2026-02-04 16:07:12.194799
493	2025-12-30T00:00:00.000Z	Sbab	-1370.00	1	283	8	2026-01-01 14:16:11.701127
508	2026-01-10T00:00:00.000Z	Ica Supermarket Arstahall	-109.40	1	300	10	2026-01-11 12:11:21.358286
509	2026-01-08T00:00:00.000Z	Ica Årstahallen	-746.16	1	301	10	2026-01-11 12:11:21.358286
507	2026-01-11T00:00:00.000Z	Matberedare	-800.00	1	304	10	2026-01-11 12:11:21.358286
532	2026-01-23T00:00:00.000Z	I00000378739	26808.00	1	328	12	2026-01-23 09:44:58.139576
531	2026-01-23T00:00:00.000Z	I00000378766	32304.00	1	329	12	2026-01-23 09:44:58.139576
535	2026-01-22T00:00:00.000Z	Easypark               Easypark.Se    Se	-180.63	1	330	12	2026-01-23 09:44:58.139576
534	2026-01-22T00:00:00.000Z	Överföring Till Ica Banks Konto	1500.00	1	331	12	2026-01-23 09:44:58.139576
533	2026-01-22T00:00:00.000Z	Maxi Ica Storm Gnist	-1119.27	1	332	12	2026-01-23 09:44:58.139576
536	2026-01-21T00:00:00.000Z	Hemkop Uppsala Svava	-58.86	1	333	12	2026-01-23 09:44:58.139576
537	2026-01-20T00:00:00.000Z	Cherry Konfektyr	-45.00	1	334	12	2026-01-23 09:44:58.139576
459	2025-12-29T00:00:00.000Z	Avgift Bankkort	-35.00	1	250	5	2025-12-29 14:57:51.853511
616	2026-03-03T00:00:00.000Z	Easypark	-14.50	1	408	17	2026-03-04 11:56:37.46327
578	2026-01-30T00:00:00.000Z	Sbab	-191.00	1	359	15	2026-02-04 16:07:12.194799
575	2026-01-30T00:00:00.000Z	Trängselskat	-11.00	1	360	15	2026-02-04 16:07:12.194799
576	2026-01-30T00:00:00.000Z	Csn	-1696.00	1	361	15	2026-02-04 16:07:12.194799
571	2026-01-30T00:00:00.000Z	Fastum Ubc	-4074.00	1	363	15	2026-02-04 16:07:12.194799
569	2026-01-30T00:00:00.000Z	Ica Årstahallen	-516.18	1	364	15	2026-02-04 16:07:12.194799
579	2026-01-29T00:00:00.000Z	Ica Årstahallen	-154.40	1	365	15	2026-02-04 16:07:12.194799
580	2026-01-29T00:00:00.000Z	Djurens Rätt	-100.00	1	366	15	2026-02-04 16:07:12.194799
584	2026-01-28T00:00:00.000Z	Union.Akassa	-160.00	1	367	15	2026-02-04 16:07:12.194799
577	2026-01-30T00:00:00.000Z	Unionen	-235.00	1	368	15	2026-02-04 16:07:12.194799
574	2026-01-30T00:00:00.000Z	Unionen	-470.00	1	369	15	2026-02-04 16:07:12.194799
585	2026-01-28T00:00:00.000Z	Union.Akassa	-160.00	1	370	15	2026-02-04 16:07:12.194799
582	2026-01-28T00:00:00.000Z	Hemkop Uppsala Svava	-49.95	1	371	15	2026-02-04 16:07:12.194799
583	2026-01-28T00:00:00.000Z	Ica Försäkr	-639.00	1	372	15	2026-02-04 16:07:12.194799
581	2026-01-28T00:00:00.000Z	Comviq.Se	-428.00	1	373	15	2026-02-04 16:07:12.194799
586	2026-01-27T00:00:00.000Z	Max Burgers 2010053 Ki	-20.00	1	374	15	2026-02-04 16:07:12.194799
589	2026-01-27T00:00:00.000Z	Agria	-293.00	1	375	15	2026-02-04 16:07:12.194799
587	2026-01-27T00:00:00.000Z	Hemkop Uppsala Svava	-72.27	1	376	15	2026-02-04 16:07:12.194799
588	2026-01-27T00:00:00.000Z	Coop Stationsgallerian	-54.95	1	377	15	2026-02-04 16:07:12.194799
572	2026-01-30T00:00:00.000Z	Csn	-1576.00	1	378	15	2026-02-04 16:07:12.194799
573	2026-01-30T00:00:00.000Z	Sbab	-1380.00	1	379	15	2026-02-04 16:07:12.194799
570	2026-01-30T00:00:00.000Z	Överföring	-1100.00	1	381	15	2026-02-04 16:07:12.194799
619	2026-03-02T00:00:00.000Z	Djurens Rätt	-100.00	1	410	17	2026-03-04 11:56:37.46327
618	2026-03-02T00:00:00.000Z	Spotify P3ff105e87	-189.00	1	411	17	2026-03-04 11:56:37.46327
620	2026-03-02T00:00:00.000Z	Sbab	-1380.00	1	412	17	2026-03-04 11:56:37.46327
622	2026-03-02T00:00:00.000Z	Sbab	-193.00	1	413	17	2026-03-04 11:56:37.46327
621	2026-03-02T00:00:00.000Z	Union.Akassa	-160.00	1	414	17	2026-03-04 11:56:37.46327
624	2026-03-02T00:00:00.000Z	Union.Akassa	-160.00	1	415	17	2026-03-04 11:56:37.46327
623	2026-03-02T00:00:00.000Z	Lf Uppsala	-151.00	1	416	17	2026-03-04 11:56:37.46327
625	2026-03-02T00:00:00.000Z	Lf Uppsala	-141.00	1	417	17	2026-03-04 11:56:37.46327
630	2026-02-27T00:00:00.000Z	Comviq.Se	-428.00	1	418	17	2026-03-04 11:56:37.46327
634	2026-02-27T00:00:00.000Z	Csn	-1696.00	1	419	17	2026-03-04 11:56:37.46327
632	2026-02-27T00:00:00.000Z	Csn	-1576.00	1	420	17	2026-03-04 11:56:37.46327
631	2026-02-27T00:00:00.000Z	Ica Årstahallen	-52.87	1	421	17	2026-03-04 11:56:37.46327
638	2026-02-27T00:00:00.000Z	Unionen	-235.00	1	422	17	2026-03-04 11:56:37.46327
626	2026-03-02T00:00:00.000Z	Folktandvård	-72.00	1	423	17	2026-03-04 11:56:37.46327
633	2026-02-27T00:00:00.000Z	Fastum Ubc	-4074.00	1	424	17	2026-03-04 11:56:37.46327
637	2026-02-27T00:00:00.000Z	Unionen	-235.00	1	425	17	2026-03-04 11:56:37.46327
639	2026-02-26T00:00:00.000Z	Maxi Ica Storm Gnist	-1805.74	1	426	17	2026-03-04 11:56:37.46327
641	2026-02-26T00:00:00.000Z	Avgift Bankkort	-35.00	1	427	17	2026-03-04 11:56:37.46327
642	2026-02-26T00:00:00.000Z	Avgift Bankkort	-35.00	1	428	17	2026-03-04 11:56:37.46327
645	2026-02-25T00:00:00.000Z	I00000382696	8308.20	1	429	17	2026-03-04 11:56:37.46327
646	2026-02-25T00:00:00.000Z	I00000382657	35386.48	1	430	17	2026-03-04 11:56:37.46327
647	2026-02-24T00:00:00.000Z	Faboden	-288.00	1	431	17	2026-03-04 11:56:37.46327
643	2026-02-25T00:00:00.000Z	Avanza Bank	-1000.00	1	432	17	2026-03-04 11:56:37.46327
644	2026-02-25T00:00:00.000Z	Avanza Bank	-1000.00	1	433	17	2026-03-04 11:56:37.46327
635	2026-02-27T00:00:00.000Z	Ica Försäkr	-639.00	1	447	17	2026-03-04 11:56:37.46327
629	2026-02-28T00:00:00.000Z	Ica Årstahallen	-41.97	1	448	17	2026-03-04 11:56:37.46327
628	2026-02-28T00:00:00.000Z	Easypark	-16.50	1	449	17	2026-03-04 11:56:37.46327
640	2026-02-26T00:00:00.000Z	Easypark	-15.75	1	450	17	2026-03-04 11:56:37.46327
627	2026-03-01T00:00:00.000Z	Loopia Ab	-12.49	1	452	17	2026-03-04 11:56:37.46327
617	2026-03-03T00:00:00.000Z	Vattenfall	-604.57	1	453	17	2026-03-04 11:56:37.46327
636	2026-02-27T00:00:00.000Z	Agria	-293.00	1	454	17	2026-03-04 11:56:37.46327
447	2025-12-25T00:00:00.000Z	Taxi Stockholm	-340.00	1	223	4	2025-12-26 21:06:46.474244
444	2025-12-26T00:00:00.000Z	Ica Supermarket Arstahall	-175.70	1	224	4	2025-12-26 21:06:46.474244
443	2025-12-26T00:00:00.000Z	Max Burgers 2010062_Ki Uppsala        Se	-334.00	1	225	4	2025-12-26 21:06:46.474244
448	2025-12-24T00:00:00.000Z	Okq8	-1123.40	1	226	4	2025-12-26 21:06:46.474244
446	2025-12-25T00:00:00.000Z	Maxi Ica Stormarknad Gnis	-372.57	1	227	4	2025-12-26 21:06:46.474244
445	2025-12-25T00:00:00.000Z	Maxi Ica Stormarknad Gnis	-133.80	1	228	4	2025-12-26 21:06:46.474244
502	2026-01-02T00:00:00.000Z	Spotify P3e08a5a81	-189.00	1	289	9	2026-01-07 00:44:35.598255
503	2026-01-02T00:00:00.000Z	Lf Uppsala	-151.00	1	290	9	2026-01-07 00:44:35.598255
505	2026-01-02T00:00:00.000Z	Lf Uppsala	-141.00	1	291	9	2026-01-07 00:44:35.598255
506	2026-01-02T00:00:00.000Z	Folktandvård	-72.00	1	292	9	2026-01-07 00:44:35.598255
504	2026-01-02T00:00:00.000Z	Vattenfall	-553.63	1	293	9	2026-01-07 00:44:35.598255
500	2026-01-05T00:00:00.000Z	Ica Supermarket Arstahall	-243.60	1	294	9	2026-01-07 00:44:35.598255
499	2026-01-07T00:00:00.000Z	Överföring	-137.49	1	295	9	2026-01-07 00:44:35.598255
501	2026-01-04T00:00:00.000Z	Överföring	-268.00	1	296	9	2026-01-07 00:44:35.598255
510	2026-01-19T00:00:00.000Z	Maxi Ica Stormarknad Sten	-289.95	1	306	11	2026-01-19 22:35:11.261707
512	2026-01-18T00:00:00.000Z	Maxi Ica Storm Gnist	-138.90	1	307	11	2026-01-19 22:35:11.261707
511	2026-01-18T00:00:00.000Z	Maxi Ica Storm Gnist	-410.26	1	308	11	2026-01-19 22:35:11.261707
514	2026-01-17T00:00:00.000Z	Rusta - 7 Uppsala Bola	-458.30	1	309	11	2026-01-19 22:35:11.261707
516	2026-01-17T00:00:00.000Z	Rusta - 7 Uppsala Bola	-199.00	1	310	11	2026-01-19 22:35:11.261707
517	2026-01-17T00:00:00.000Z	Dollarstore Uppsala	-75.00	1	311	11	2026-01-19 22:35:11.261707
515	2026-01-17T00:00:00.000Z	Ikea Uppsala Hfb Eco	-216.00	1	312	11	2026-01-19 22:35:11.261707
519	2026-01-16T00:00:00.000Z	Ica Årstahallen	-404.23	1	313	11	2026-01-19 22:35:11.261707
520	2026-01-15T00:00:00.000Z	Hemkop Uppsala Svava	-61.09	1	314	11	2026-01-19 22:35:11.261707
522	2026-01-14T00:00:00.000Z	Ica Årstahallen	-259.80	1	315	11	2026-01-19 22:35:11.261707
521	2026-01-14T00:00:00.000Z	Ica Årstahallen	-161.66	1	316	11	2026-01-19 22:35:11.261707
523	2026-01-13T00:00:00.000Z	Hemkop Uppsala Svava	-42.95	1	317	11	2026-01-19 22:35:11.261707
526	2026-01-12T00:00:00.000Z	Netflix.Com	-109.00	1	318	11	2026-01-19 22:35:11.261707
527	2026-01-11T00:00:00.000Z	Ikea Barkarby If Custo	-24.00	1	319	11	2026-01-19 22:35:11.261707
529	2026-01-11T00:00:00.000Z	Maxi Ica Storm Gnist	-599.95	1	320	11	2026-01-19 22:35:11.261707
513	2026-01-18T00:00:00.000Z	Överföring Till Ica Banks Konto	1000.00	1	321	11	2026-01-19 22:35:11.261707
518	2026-01-17T00:00:00.000Z	Överföring Till Ica Banks Konto	1000.00	1	322	11	2026-01-19 22:35:11.261707
524	2026-01-13T00:00:00.000Z	Överföring Till Ica Banks Konto	1000.00	1	323	11	2026-01-19 22:35:11.261707
530	2026-01-11T00:00:00.000Z	Överföring Till Ica Banks Konto	500.00	1	324	11	2026-01-19 22:35:11.261707
525	2026-01-13T00:00:00.000Z	Överföring	-45.00	1	325	11	2026-01-19 22:35:11.261707
528	2026-01-11T00:00:00.000Z	Ikea Barkarby Hfb Eco	-677.00	1	326	11	2026-01-19 22:35:11.261707
556	2026-01-23T00:00:00.000Z	Överföring	-4500.00	1	339	14	2026-01-26 08:45:09.423568
554	2026-01-23T00:00:00.000Z	Ica Årstahallen	-223.47	1	340	14	2026-01-26 08:45:09.423568
552	2026-01-25T00:00:00.000Z	Överföring	-226.00	1	341	14	2026-01-26 08:45:09.423568
553	2026-01-25T00:00:00.000Z	Pressbyran 4308650     Uppsala        Se	-133.00	1	342	14	2026-01-26 08:45:09.423568
551	2026-01-25T00:00:00.000Z	Överföring	-8000.00	1	343	14	2026-01-26 08:45:09.423568
550	2026-01-26T00:00:00.000Z	Avgift Bankkort	-35.00	1	344	14	2026-01-26 08:45:09.423568
549	2026-01-26T00:00:00.000Z	Avgift Bankkort	-35.00	1	345	14	2026-01-26 08:45:09.423568
546	2026-01-26T00:00:00.000Z	Överföring	-226.00	1	346	14	2026-01-26 08:45:09.423568
548	2026-01-26T00:00:00.000Z	Avanza Bank	-1000.00	1	347	14	2026-01-26 08:45:09.423568
547	2026-01-26T00:00:00.000Z	Avanza Bank	-1000.00	1	348	14	2026-01-26 08:45:09.423568
545	2026-01-26T00:00:00.000Z	Överföring	-2536.00	1	349	14	2026-01-26 08:45:09.423568
555	2026-01-23T00:00:00.000Z	Överföring	-3161.00	1	350	14	2026-01-26 08:45:09.423568
590	2026-02-15T00:00:00.000Z	Fjallnora Frilu	-320.00	1	382	16	2026-02-16 13:53:04.002216
596	2026-02-13T00:00:00.000Z	Ica Årstahallen	-518.61	1	383	16	2026-02-16 13:53:04.002216
594	2026-02-14T00:00:00.000Z	Maxi Ica Storm Gnist	-1055.19	1	384	16	2026-02-16 13:53:04.002216
595	2026-02-13T00:00:00.000Z	Hemkop Uppsala Svava	-75.99	1	385	16	2026-02-16 13:53:04.002216
599	2026-02-12T00:00:00.000Z	Easypark	-18.75	1	386	16	2026-02-16 13:53:04.002216
598	2026-02-12T00:00:00.000Z	Netflix.Com	-109.00	1	387	16	2026-02-16 13:53:04.002216
600	2026-02-11T00:00:00.000Z	Hemkop Uppsala Svava	-72.27	1	388	16	2026-02-16 13:53:04.002216
593	2026-02-14T00:00:00.000Z	Easypark	-17.00	1	389	16	2026-02-16 13:53:04.002216
591	2026-02-15T00:00:00.000Z	Preem Uppsala Kumlag.	-122.00	1	390	16	2026-02-16 13:53:04.002216
592	2026-02-15T00:00:00.000Z	Överföring	-299.00	1	391	16	2026-02-16 13:53:04.002216
605	2026-02-06T00:00:00.000Z	Mcdbolanderna	-291.00	1	392	16	2026-02-16 13:53:04.002216
606	2026-02-06T00:00:00.000Z	Maxi Ica Storm Gnist	-39.95	1	393	16	2026-02-16 13:53:04.002216
604	2026-02-07T00:00:00.000Z	Maxi Ica Storm Gnist	-308.14	1	394	16	2026-02-16 13:53:04.002216
602	2026-02-09T00:00:00.000Z	Ica Årstahallen	-283.30	1	395	16	2026-02-16 13:53:04.002216
603	2026-02-08T00:00:00.000Z	Maxi Ica Storm Gnist	-209.85	1	396	16	2026-02-16 13:53:04.002216
607	2026-02-06T00:00:00.000Z	Maxi Ica Storm Gnist	-127.75	1	397	16	2026-02-16 13:53:04.002216
608	2026-02-05T00:00:00.000Z	Ica Årstahallen	-128.80	1	398	16	2026-02-16 13:53:04.002216
601	2026-02-11T00:00:00.000Z	Torgkassen Ab	-245.80	1	399	16	2026-02-16 13:53:04.002216
597	2026-02-12T00:00:00.000Z	Arsta Travcafe	-89.00	1	400	16	2026-02-16 13:53:04.002216
611	2026-03-03T00:00:00.000Z	W*Teknikmagasinet.Se   Sollentuna     Se	-119.00	0	\N	17	2026-03-04 11:56:37.46327
614	2026-03-03T00:00:00.000Z	Norrlands Natio        Uppsala        Se	-280.00	1	406	17	2026-03-04 11:56:37.46327
610	2026-03-04T00:00:00.000Z	Easypark               Easypark.Se    Se	-8.33	1	407	17	2026-03-04 11:56:37.46327
612	2026-03-03T00:00:00.000Z	Max Burgers 2010053_Ki Uppsala        Se	-72.00	1	409	17	2026-03-04 11:56:37.46327
615	2026-03-03T00:00:00.000Z	Erikshjalpen Up        Goteborg       Se	-216.00	1	455	17	2026-03-04 11:56:37.46327
609	2026-03-04T00:00:00.000Z	Överföring	-8000.00	1	403	17	2026-03-04 11:56:37.46327
613	2026-03-03T00:00:00.000Z	Baras Gø Mstø Lle      Uppsala        Se	-98.00	1	405	17	2026-03-04 11:56:37.46327
648	2026-02-24T00:00:00.000Z	Mcduppsalafyrislund	-211.00	1	434	17	2026-03-04 11:56:37.46327
650	2026-02-23T00:00:00.000Z	Ica Årstahallen	-516.82	1	435	17	2026-03-04 11:56:37.46327
652	2026-02-20T00:00:00.000Z	Torgkassen Ab	-50.80	1	436	17	2026-03-04 11:56:37.46327
654	2026-02-19T00:00:00.000Z	Easypark	-16.25	1	437	17	2026-03-04 11:56:37.46327
653	2026-02-19T00:00:00.000Z	Preem Vagnharad	-1162.84	1	438	17	2026-03-04 11:56:37.46327
655	2026-02-18T00:00:00.000Z	Hemkop Uppsala Svava	-58.11	1	439	17	2026-03-04 11:56:37.46327
656	2026-02-18T00:00:00.000Z	Restaurang Capri	-280.00	1	440	17	2026-03-04 11:56:37.46327
658	2026-02-17T00:00:00.000Z	Ica Årstahallen	-370.30	1	441	17	2026-03-04 11:56:37.46327
659	2026-02-17T00:00:00.000Z	Easypark	-17.50	1	442	17	2026-03-04 11:56:37.46327
657	2026-02-17T00:00:00.000Z	Maxi Ica Storm Gnist	-158.85	1	443	17	2026-03-04 11:56:37.46327
651	2026-02-20T00:00:00.000Z	Systembolaget	-209.00	1	444	17	2026-03-04 11:56:37.46327
660	2026-02-16T00:00:00.000Z	Överföring Till Ica Banks Konto	3161.00	1	445	17	2026-03-04 11:56:37.46327
661	2026-02-16T00:00:00.000Z	Överföring	-3523.00	1	446	17	2026-03-04 11:56:37.46327
649	2026-02-24T00:00:00.000Z	Easypark	-16.50	1	451	17	2026-03-04 11:56:37.46327
702	2026-03-16T00:00:00.000Z	Nyx Saniboxab	-10.00	0	\N	18	2026-03-28 21:54:40.149052
703	2026-03-16T00:00:00.000Z	Fusion Art Ab	-3169.00	0	\N	18	2026-03-28 21:54:40.149052
706	2026-03-15T00:00:00.000Z	Stadium Outlet	-1206.00	0	\N	18	2026-03-28 21:54:40.149052
662	2026-03-28T00:00:00.000Z	Stora Coop Bolanderna  Uppsala        Se	-17.95	1	462	18	2026-03-28 21:54:40.149052
663	2026-03-28T00:00:00.000Z	Clas Ohlson 305        Uppsala        Se	-389.30	1	463	18	2026-03-28 21:54:40.149052
664	2026-03-28T00:00:00.000Z	Jula Sverige Ab 405    Uppsala        Se	-1137.70	1	464	18	2026-03-28 21:54:40.149052
665	2026-03-28T00:00:00.000Z	Rusta - 7 Uppsala Bolø Uppsala        Se	-275.30	1	465	18	2026-03-28 21:54:40.149052
666	2026-03-28T00:00:00.000Z	Rusta - 7 Uppsala Bolø Uppsala Se	120.60	1	466	18	2026-03-28 21:54:40.149052
670	2026-03-27T00:00:00.000Z	A-Kassa	9783.00	1	467	18	2026-03-28 21:54:40.149052
671	2026-03-27T00:00:00.000Z	Ica Försäkr	-639.00	1	468	18	2026-03-28 21:54:40.149052
672	2026-03-27T00:00:00.000Z	Agria	-293.00	1	469	18	2026-03-28 21:54:40.149052
668	2026-03-27T00:00:00.000Z	Ica Gribbylund	-46.80	1	470	18	2026-03-28 21:54:40.149052
669	2026-03-27T00:00:00.000Z	Comviq.Se              Kista          Se	-428.00	1	471	18	2026-03-28 21:54:40.149052
673	2026-03-26T00:00:00.000Z	Okq8	-1303.31	1	472	18	2026-03-28 21:54:40.149052
674	2026-03-26T00:00:00.000Z	Hemkop Uppsala Svava	-89.00	1	473	18	2026-03-28 21:54:40.149052
675	2026-03-26T00:00:00.000Z	Maxi Ica Storm Gnist	-1304.23	1	474	18	2026-03-28 21:54:40.149052
676	2026-03-26T00:00:00.000Z	Överföring	-8000.00	1	475	18	2026-03-28 21:54:40.149052
679	2026-03-26T00:00:00.000Z	Avgift Bankkort	-35.00	1	476	18	2026-03-28 21:54:40.149052
678	2026-03-26T00:00:00.000Z	Avgift Bankkort	-35.00	1	477	18	2026-03-28 21:54:40.149052
683	2026-03-25T00:00:00.000Z	Avanza Bank	-1000.00	1	478	18	2026-03-28 21:54:40.149052
682	2026-03-25T00:00:00.000Z	Avanza Bank	-1000.00	1	479	18	2026-03-28 21:54:40.149052
684	2026-03-25T00:00:00.000Z	I00000386359	32500.00	1	480	18	2026-03-28 21:54:40.149052
686	2026-03-22T00:00:00.000Z	Fullero Handel	-45.00	1	481	18	2026-03-28 21:54:40.149052
685	2026-03-24T00:00:00.000Z	Rusta - 7 Uppsala Bola	-739.60	1	482	18	2026-03-28 21:54:40.149052
680	2026-03-25T00:00:00.000Z	Hemkop Uppsala Svava	-99.83	1	483	18	2026-03-28 21:54:40.149052
688	2026-03-22T00:00:00.000Z	Ica Årstahallen	-364.60	1	484	18	2026-03-28 21:54:40.149052
690	2026-03-21T00:00:00.000Z	Ica Årstahallen	-69.29	1	485	18	2026-03-28 21:54:40.149052
689	2026-03-21T00:00:00.000Z	Willys Uppsala Bjork	-320.94	1	486	18	2026-03-28 21:54:40.149052
692	2026-03-20T00:00:00.000Z	Ul  Region Uppsala	-40.00	1	487	18	2026-03-28 21:54:40.149052
693	2026-03-20T00:00:00.000Z	Uds Smadjur	-519.00	1	488	18	2026-03-28 21:54:40.149052
695	2026-03-19T00:00:00.000Z	Ica Årstahallen	-33.54	1	489	18	2026-03-28 21:54:40.149052
699	2026-03-17T00:00:00.000Z	Ul  Region Uppsala	-80.00	1	490	18	2026-03-28 21:54:40.149052
698	2026-03-17T00:00:00.000Z	Ul  Region Uppsala	-40.00	1	491	18	2026-03-28 21:54:40.149052
700	2026-03-17T00:00:00.000Z	Easypark	-11.58	1	492	18	2026-03-28 21:54:40.149052
707	2026-03-15T00:00:00.000Z	Maxi Ica Storm Gnist	-1277.03	1	493	18	2026-03-28 21:54:40.149052
710	2026-03-13T00:00:00.000Z	Willys Uppsala Bjork	-667.48	1	494	18	2026-03-28 21:54:40.149052
708	2026-03-14T00:00:00.000Z	Rusta - 7 Uppsala Bola	-159.40	1	495	18	2026-03-28 21:54:40.149052
701	2026-03-16T00:00:00.000Z	Ul  Region Uppsala	-40.00	1	506	18	2026-03-28 21:54:40.149052
696	2026-03-18T00:00:00.000Z	Katalin And All That J	-90.00	1	507	18	2026-03-28 21:54:40.149052
697	2026-03-18T00:00:00.000Z	Överföring Till Ica Banks Konto	90.00	1	508	18	2026-03-28 21:54:40.149052
691	2026-03-20T00:00:00.000Z	Hemkop Uppsala Svava	-67.05	1	509	18	2026-03-28 21:54:40.149052
667	2026-03-27T00:00:00.000Z	Ellos Ab               Boras          Se	-678.20	1	510	18	2026-03-28 21:54:40.149052
677	2026-03-26T00:00:00.000Z	Överföring	-6000.00	1	511	18	2026-03-28 21:54:40.149052
694	2026-03-20T00:00:00.000Z	Maxi Ica Storm Gnist	-231.60	1	512	18	2026-03-28 21:54:40.149052
705	2026-03-15T00:00:00.000Z	Plantagen Uppsa	-334.73	1	513	18	2026-03-28 21:54:40.149052
709	2026-03-13T00:00:00.000Z	W Meds.Se	-500.00	1	517	18	2026-03-28 21:54:40.149052
704	2026-03-16T00:00:00.000Z	Hemmakvall Upps	-46.99	1	518	18	2026-03-28 21:54:40.149052
687	2026-03-22T00:00:00.000Z	Max Burgers 2010069 Ec	-288.00	1	519	18	2026-03-28 21:54:40.149052
681	2026-03-25T00:00:00.000Z	Max Burgers 2010053 Ki	-152.00	1	520	18	2026-03-28 21:54:40.149052
711	2026-03-12T00:00:00.000Z	Chicce	-149.00	0	\N	18	2026-03-28 21:54:40.149052
712	2026-03-12T00:00:00.000Z	Pressbyran 4225394	-102.00	0	\N	18	2026-03-28 21:54:40.149052
717	2026-03-10T00:00:00.000Z	Överföring	-128.00	0	\N	18	2026-03-28 21:54:40.149052
714	2026-03-12T00:00:00.000Z	Netflix.Com	-109.00	1	496	18	2026-03-28 21:54:40.149052
715	2026-03-11T00:00:00.000Z	Ammortering	-13000.00	1	497	18	2026-03-28 21:54:40.149052
716	2026-03-10T00:00:00.000Z	Easypark	-18.50	1	498	18	2026-03-28 21:54:40.149052
718	2026-03-09T00:00:00.000Z	Maxi Ica Storm Gnist	-325.89	1	499	18	2026-03-28 21:54:40.149052
723	2026-03-07T00:00:00.000Z	Maxi Ica Storm Gnist	-1361.95	1	500	18	2026-03-28 21:54:40.149052
720	2026-03-07T00:00:00.000Z	Citysallad I Uppsala	-270.00	1	501	18	2026-03-28 21:54:40.149052
713	2026-03-12T00:00:00.000Z	Easypark	-16.50	1	502	18	2026-03-28 21:54:40.149052
722	2026-03-07T00:00:00.000Z	Easypark	-17.50	1	503	18	2026-03-28 21:54:40.149052
724	2026-03-05T00:00:00.000Z	Easypark	-5.92	1	504	18	2026-03-28 21:54:40.149052
721	2026-03-07T00:00:00.000Z	Ahlens Outlet Uppsala	-60.00	1	505	18	2026-03-28 21:54:40.149052
726	2026-07-01T00:00:00.000Z	Loopia Ab	-12.49	0	\N	19	2026-07-02 21:10:33.494574
728	2026-07-01T00:00:00.000Z	Mcdonalds 75200316     Uppsala        Se	-181.00	0	\N	19	2026-07-02 21:10:33.494574
729	2026-07-01T00:00:00.000Z	Folksam	-235.00	0	\N	19	2026-07-02 21:10:33.494574
730	2026-07-01T00:00:00.000Z	Vattenfall	-645.37	0	\N	19	2026-07-02 21:10:33.494574
731	2026-07-01T00:00:00.000Z	Lf Uppsala	-220.00	0	\N	19	2026-07-02 21:10:33.494574
732	2026-07-01T00:00:00.000Z	Lf Uppsala	-141.00	0	\N	19	2026-07-02 21:10:33.494574
733	2026-06-30T00:00:00.000Z	Lyssnaangen	-44.00	0	\N	19	2026-07-02 21:10:33.494574
734	2026-06-30T00:00:00.000Z	Willys Uppsala Bjork	-647.92	0	\N	19	2026-07-02 21:10:33.494574
735	2026-06-30T00:00:00.000Z	Fastum Ubc	-4074.00	0	\N	19	2026-07-02 21:10:33.494574
736	2026-06-30T00:00:00.000Z	Csn	-1576.00	0	\N	19	2026-07-02 21:10:33.494574
737	2026-06-30T00:00:00.000Z	Csn	-1696.00	0	\N	19	2026-07-02 21:10:33.494574
738	2026-06-30T00:00:00.000Z	Sbab	-1437.00	0	\N	19	2026-07-02 21:10:33.494574
739	2026-06-30T00:00:00.000Z	Unionen	-235.00	0	\N	19	2026-07-02 21:10:33.494574
740	2026-06-30T00:00:00.000Z	Folktandvård	-97.00	0	\N	19	2026-07-02 21:10:33.494574
741	2026-06-30T00:00:00.000Z	Sbab	-170.00	0	\N	19	2026-07-02 21:10:33.494574
742	2026-06-30T00:00:00.000Z	Unionen	-235.00	0	\N	19	2026-07-02 21:10:33.494574
743	2026-06-29T00:00:00.000Z	Atac Tap&Go	-16.95	0	\N	19	2026-07-02 21:10:33.494574
744	2026-06-29T00:00:00.000Z	Citta  Del Sole-Seleg.	-134.99	0	\N	19	2026-07-02 21:10:33.494574
745	2026-06-29T00:00:00.000Z	Farinella Mezzanino	-428.12	0	\N	19	2026-07-02 21:10:33.494574
746	2026-06-29T00:00:00.000Z	Aelia Duty Free	-77.95	0	\N	19	2026-07-02 21:10:33.494574
747	2026-06-29T00:00:00.000Z	Inflight Services Norw	-75.00	0	\N	19	2026-07-02 21:10:33.494574
748	2026-06-29T00:00:00.000Z	Comviq.Se	-428.00	0	\N	19	2026-07-02 21:10:33.494574
749	2026-06-29T00:00:00.000Z	Lön+Cykelserv	12780.00	0	\N	19	2026-07-02 21:10:33.494574
750	2026-06-29T00:00:00.000Z	Union.Akassa	-160.00	0	\N	19	2026-07-02 21:10:33.494574
751	2026-06-29T00:00:00.000Z	Agria	-220.00	0	\N	19	2026-07-02 21:10:33.494574
752	2026-06-29T00:00:00.000Z	Union.Akassa	-160.00	0	\N	19	2026-07-02 21:10:33.494574
753	2026-06-29T00:00:00.000Z	Djurens Rätt	-100.00	0	\N	19	2026-07-02 21:10:33.494574
754	2026-06-29T00:00:00.000Z	Trängselskat	-45.00	0	\N	19	2026-07-02 21:10:33.494574
755	2026-06-28T00:00:00.000Z	Larancinuspacchiusu	-129.91	0	\N	19	2026-07-02 21:10:33.494574
756	2026-06-28T00:00:00.000Z	Sumup   Stabilimento B	-248.51	0	\N	19	2026-07-02 21:10:33.494574
757	2026-06-28T00:00:00.000Z	Greco Anna Maria	-45.19	0	\N	19	2026-07-02 21:10:33.494574
758	2026-06-28T00:00:00.000Z	L Arca Di Noah	-1694.43	0	\N	19	2026-07-02 21:10:33.494574
759	2026-06-27T00:00:00.000Z	I Nobili	-22.60	0	\N	19	2026-07-02 21:10:33.494574
760	2026-06-27T00:00:00.000Z	Maraschino Harmonybeac	-124.26	0	\N	19	2026-07-02 21:10:33.494574
761	2026-06-27T00:00:00.000Z	Sumup   Stabilimento B	-248.51	0	\N	19	2026-07-02 21:10:33.494574
762	2026-06-27T00:00:00.000Z	Sumup   Cannata C. Srl	-903.70	0	\N	19	2026-07-02 21:10:33.494574
763	2026-06-26T00:00:00.000Z	Stabilimento Balneare.	-248.68	0	\N	19	2026-07-02 21:10:33.494574
764	2026-06-26T00:00:00.000Z	Tigre Amico	-262.01	0	\N	19	2026-07-02 21:10:33.494574
765	2026-06-26T00:00:00.000Z	Anzio Frutta	-114.84	0	\N	19	2026-07-02 21:10:33.494574
766	2026-06-26T00:00:00.000Z	Centro Shopping Anzio	-66.69	0	\N	19	2026-07-02 21:10:33.494574
767	2026-06-26T00:00:00.000Z	Ica Försäkr	-639.00	0	\N	19	2026-07-02 21:10:33.494574
768	2026-06-26T00:00:00.000Z	Avgift Bankkort	-35.00	0	\N	19	2026-07-02 21:10:33.494574
769	2026-06-26T00:00:00.000Z	Avgift Bankkort	-35.00	0	\N	19	2026-07-02 21:10:33.494574
770	2026-06-25T00:00:00.000Z	Mangal Bbq	-159.00	0	\N	19	2026-07-02 21:10:33.494574
771	2026-06-25T00:00:00.000Z	A096 Se Arn Whsmith L3	-229.90	0	\N	19	2026-07-02 21:10:33.494574
772	2026-06-25T00:00:00.000Z	Ul  Region Uppsala	-40.00	0	\N	19	2026-07-02 21:10:33.494574
773	2026-06-25T00:00:00.000Z	Inflight Services Norw	-136.00	0	\N	19	2026-07-02 21:10:33.494574
774	2026-06-25T00:00:00.000Z	7-Eleven Arlanda Marke	-90.00	0	\N	19	2026-07-02 21:10:33.494574
775	2026-06-25T00:00:00.000Z	Pressbyran 4308650	-33.00	0	\N	19	2026-07-02 21:10:33.494574
776	2026-06-25T00:00:00.000Z	Pressbyran 4308650	-26.00	0	\N	19	2026-07-02 21:10:33.494574
777	2026-06-25T00:00:00.000Z	Överföring	-8000.00	0	\N	19	2026-07-02 21:10:33.494574
778	2026-06-25T00:00:00.000Z	Överföring	-10000.00	0	\N	19	2026-07-02 21:10:33.494574
779	2026-06-25T00:00:00.000Z	Avanza Bank	-1000.00	0	\N	19	2026-07-02 21:10:33.494574
780	2026-06-25T00:00:00.000Z	Avanza Bank	-1000.00	0	\N	19	2026-07-02 21:10:33.494574
781	2026-06-25T00:00:00.000Z	I00000397337	39268.00	0	\N	19	2026-07-02 21:10:33.494574
782	2026-06-24T00:00:00.000Z	Ica Årstahallen	-99.26	0	\N	19	2026-07-02 21:10:33.494574
783	2026-06-23T00:00:00.000Z	Vfi Cykel - Viktor Ab	-1260.00	0	\N	19	2026-07-02 21:10:33.494574
725	2026-07-02T00:00:00.000Z	Spotify P442b2bd0c     Stockholm      Se	-189.00	1	514	19	2026-07-02 21:10:33.494574
727	2026-07-01T00:00:00.000Z	Maxi Ica Storm Gnist	-480.01	1	515	19	2026-07-02 21:10:33.494574
719	2026-03-08T00:00:00.000Z	Baras Backe	-558.00	1	516	18	2026-03-28 21:54:40.149052
784	2026-06-23T00:00:00.000Z	Lindex Uppsala	-349.00	0	\N	19	2026-07-02 21:10:33.494574
785	2026-06-23T00:00:00.000Z	Din Sko 1002	-573.50	0	\N	19	2026-07-02 21:10:33.494574
786	2026-06-23T00:00:00.000Z	Maxi Ica Storm Gnist	-96.20	0	\N	19	2026-07-02 21:10:33.494574
787	2026-06-22T00:00:00.000Z	Mcduppsalafyrislund	-189.00	0	\N	19	2026-07-02 21:10:33.494574
788	2026-06-22T00:00:00.000Z	Apoteket Bolaenderna	-70.49	0	\N	19	2026-07-02 21:10:33.494574
789	2026-06-22T00:00:00.000Z	Maxi Ica Storm Gnist	-156.55	0	\N	19	2026-07-02 21:10:33.494574
790	2026-06-21T00:00:00.000Z	Maxi Ica Storm Gnist	-163.29	0	\N	19	2026-07-02 21:10:33.494574
791	2026-06-19T00:00:00.000Z	Preem Ramstalund	-185.81	0	\N	19	2026-07-02 21:10:33.494574
792	2026-06-19T00:00:00.000Z	Maxi Ica Storm Gnist	-896.15	0	\N	19	2026-07-02 21:10:33.494574
793	2026-06-18T00:00:00.000Z	Max Burgers 2010062 Ki	-156.00	0	\N	19	2026-07-02 21:10:33.494574
794	2026-06-17T00:00:00.000Z	Preem Ramstalund	-1264.94	0	\N	19	2026-07-02 21:10:33.494574
795	2026-06-17T00:00:00.000Z	Maxi Ica Storm Gnist	-13.58	0	\N	19	2026-07-02 21:10:33.494574
796	2026-06-17T00:00:00.000Z	Maxi Ica Storm Gnist	-152.89	0	\N	19	2026-07-02 21:10:33.494574
797	2026-06-15T00:00:00.000Z	Apoteket Bolaenderna	-149.00	0	\N	19	2026-07-02 21:10:33.494574
798	2026-06-14T00:00:00.000Z	Spigamadre	-126.00	0	\N	19	2026-07-02 21:10:33.494574
799	2026-06-14T00:00:00.000Z	Apotek Hjärtat Ica M	-339.00	0	\N	19	2026-07-02 21:10:33.494574
800	2026-06-14T00:00:00.000Z	Maxi Ica Storm Gnist	-142.71	0	\N	19	2026-07-02 21:10:33.494574
801	2026-06-13T00:00:00.000Z	Uppsala Gelateria	-69.00	0	\N	19	2026-07-02 21:10:33.494574
802	2026-06-13T00:00:00.000Z	Maxi Ica Storm Gnist	-1929.00	0	\N	19	2026-07-02 21:10:33.494574
803	2026-06-13T00:00:00.000Z	Ica Årstahallen	-48.68	0	\N	19	2026-07-02 21:10:33.494574
804	2026-06-12T00:00:00.000Z	Maxi Ica Storm Gnist	-19.80	0	\N	19	2026-07-02 21:10:33.494574
805	2026-06-12T00:00:00.000Z	Netflix.Com	-109.00	0	\N	19	2026-07-02 21:10:33.494574
806	2026-06-11T00:00:00.000Z	Maxi Ica Storm Gnist	-224.10	0	\N	19	2026-07-02 21:10:33.494574
807	2026-06-10T00:00:00.000Z	Mcdbolanderna	-77.00	0	\N	19	2026-07-02 21:10:33.494574
808	2026-06-10T00:00:00.000Z	Rusta - 7 Uppsala Bola	-248.60	0	\N	19	2026-07-02 21:10:33.494574
809	2026-06-10T00:00:00.000Z	Jysk Bolanderna	-13.50	0	\N	19	2026-07-02 21:10:33.494574
810	2026-06-10T00:00:00.000Z	Maxi Ica Storm Gnist	-19.80	0	\N	19	2026-07-02 21:10:33.494574
811	2026-06-09T00:00:00.000Z	Broedernas Uppsala Ab	-125.00	0	\N	19	2026-07-02 21:10:33.494574
812	2026-06-09T00:00:00.000Z	Maxi Ica Storm Gnist	-738.68	0	\N	19	2026-07-02 21:10:33.494574
813	2026-06-07T00:00:00.000Z	Citysallad I Uppsala	-390.00	0	\N	19	2026-07-02 21:10:33.494574
814	2026-06-07T00:00:00.000Z	Aimo  Aimo Park	-26.95	0	\N	19	2026-07-02 21:10:33.494574
815	2026-06-06T00:00:00.000Z	Ica Årstahallen	-292.63	0	\N	19	2026-07-02 21:10:33.494574
816	2026-06-05T00:00:00.000Z	Gronalund Tivol	-50.00	0	\N	19	2026-07-02 21:10:33.494574
817	2026-06-05T00:00:00.000Z	Scm Se 21	-350.00	0	\N	19	2026-07-02 21:10:33.494574
818	2026-06-05T00:00:00.000Z	Hemkop Stockholm Cit	-16.00	0	\N	19	2026-07-02 21:10:33.494574
820	2026-06-05T00:00:00.000Z	Max Burgers	-32.00	0	\N	19	2026-07-02 21:10:33.494574
821	2026-06-04T00:00:00.000Z	Sl	-43.00	0	\N	19	2026-07-02 21:10:33.494574
826	2026-06-01T00:00:00.000Z	Loopia Ab	-12.49	0	\N	19	2026-07-02 21:10:33.494574
829	2026-06-01T00:00:00.000Z	Sbab	-1380.00	0	\N	19	2026-07-02 21:10:33.494574
830	2026-06-01T00:00:00.000Z	Folksam	-235.00	0	\N	19	2026-07-02 21:10:33.494574
831	2026-06-01T00:00:00.000Z	Lf Uppsala	-220.00	0	\N	19	2026-07-02 21:10:33.494574
832	2026-06-01T00:00:00.000Z	Lf Uppsala	-141.00	0	\N	19	2026-07-02 21:10:33.494574
833	2026-06-01T00:00:00.000Z	Vattenfall	-606.25	0	\N	19	2026-07-02 21:10:33.494574
834	2026-06-01T00:00:00.000Z	Sbab	-164.00	0	\N	19	2026-07-02 21:10:33.494574
835	2026-06-01T00:00:00.000Z	Folktandvård	-97.00	0	\N	19	2026-07-02 21:10:33.494574
836	2026-06-01T00:00:00.000Z	2434758947 Tui	-9042.00	0	\N	19	2026-07-02 21:10:33.494574
838	2026-05-31T00:00:00.000Z	Easypark	-45.75	0	\N	19	2026-07-02 21:10:33.494574
841	2026-05-29T00:00:00.000Z	Hemkop Uppsala Svava	-57.11	0	\N	19	2026-07-02 21:10:33.494574
843	2026-05-29T00:00:00.000Z	Överföring Till Ica Banks Konto	9042.00	0	\N	19	2026-07-02 21:10:33.494574
844	2026-05-29T00:00:00.000Z	Överföring	-9042.00	0	\N	19	2026-07-02 21:10:33.494574
845	2026-05-29T00:00:00.000Z	Överföring	18000.00	0	\N	19	2026-07-02 21:10:33.494574
851	2026-05-28T00:00:00.000Z	Restaurang Heaven	-45.00	0	\N	19	2026-07-02 21:10:33.494574
853	2026-05-28T00:00:00.000Z	Ica Försäkr	-639.00	0	\N	19	2026-07-02 21:10:33.494574
854	2026-05-28T00:00:00.000Z	Union.Akassa	-160.00	0	\N	19	2026-07-02 21:10:33.494574
856	2026-05-28T00:00:00.000Z	Djurens Rätt	-100.00	0	\N	19	2026-07-02 21:10:33.494574
857	2026-05-27T00:00:00.000Z	Hemkop Uppsala Svava	-56.40	0	\N	19	2026-07-02 21:10:33.494574
858	2026-05-27T00:00:00.000Z	Överföring Till Ica Banks Konto	12500.00	0	\N	19	2026-07-02 21:10:33.494574
859	2026-05-27T00:00:00.000Z	Agria	-220.00	0	\N	19	2026-07-02 21:10:33.494574
860	2026-05-26T00:00:00.000Z	Tickster.Com	-552.00	0	\N	19	2026-07-02 21:10:33.494574
862	2026-05-26T00:00:00.000Z	Överföring	-1212.00	0	\N	19	2026-07-02 21:10:33.494574
863	2026-05-26T00:00:00.000Z	Överföring	-380.00	0	\N	19	2026-07-02 21:10:33.494574
864	2026-05-26T00:00:00.000Z	Överföring	-900.00	0	\N	19	2026-07-02 21:10:33.494574
865	2026-05-26T00:00:00.000Z	Avgift Bankkort	-35.00	0	\N	19	2026-07-02 21:10:33.494574
866	2026-05-26T00:00:00.000Z	Avgift Bankkort	-35.00	0	\N	19	2026-07-02 21:10:33.494574
823	2026-06-03T00:00:00.000Z	Maxi Ica Storm Gnist	-19.80	1	530	19	2026-07-02 21:10:33.494574
825	2026-06-02T00:00:00.000Z	Maxi Ica Storm Gnist	-22.63	1	531	19	2026-07-02 21:10:33.494574
827	2026-06-01T00:00:00.000Z	Mcdonalds 75200316	-171.00	1	532	19	2026-07-02 21:10:33.494574
828	2026-06-01T00:00:00.000Z	Överföring	-8000.00	1	533	19	2026-07-02 21:10:33.494574
824	2026-06-02T00:00:00.000Z	Spotify P4318f5404	-189.00	1	534	19	2026-07-02 21:10:33.494574
837	2026-05-31T00:00:00.000Z	Lyssnaangen	-12.00	1	535	19	2026-07-02 21:10:33.494574
839	2026-05-30T00:00:00.000Z	Maxi Ica Storm Gnist	-323.98	1	536	19	2026-07-02 21:10:33.494574
847	2026-05-29T00:00:00.000Z	Csn	-1696.00	1	537	19	2026-07-02 21:10:33.494574
848	2026-05-29T00:00:00.000Z	Csn	-1576.00	1	538	19	2026-07-02 21:10:33.494574
849	2026-05-29T00:00:00.000Z	Unionen	-235.00	1	539	19	2026-07-02 21:10:33.494574
850	2026-05-29T00:00:00.000Z	Unionen	-235.00	1	540	19	2026-07-02 21:10:33.494574
840	2026-05-29T00:00:00.000Z	Citysallad I Uppsala	-260.00	1	542	19	2026-07-02 21:10:33.494574
855	2026-05-28T00:00:00.000Z	Union.Akassa	-160.00	1	543	19	2026-07-02 21:10:33.494574
842	2026-05-29T00:00:00.000Z	Lyssnaangen	-112.00	1	544	19	2026-07-02 21:10:33.494574
852	2026-05-28T00:00:00.000Z	Comviq.Se	-428.00	1	545	19	2026-07-02 21:10:33.494574
861	2026-05-26T00:00:00.000Z	Maxi Ica Storm Gnist	-397.74	1	546	19	2026-07-02 21:10:33.494574
867	2026-05-25T00:00:00.000Z	Överföring	-17246.00	0	\N	19	2026-07-02 21:10:33.494574
868	2026-05-25T00:00:00.000Z	Avanza Bank	-1000.00	0	\N	19	2026-07-02 21:10:33.494574
869	2026-05-25T00:00:00.000Z	Avanza Bank	-1000.00	0	\N	19	2026-07-02 21:10:33.494574
872	2026-05-24T00:00:00.000Z	Lyssnaangen	-35.00	0	\N	19	2026-07-02 21:10:33.494574
875	2026-05-24T00:00:00.000Z	Överföring Till Ica Banks Konto	500.00	0	\N	19	2026-07-02 21:10:33.494574
876	2026-05-23T00:00:00.000Z	Lyssnaangen	-80.00	0	\N	19	2026-07-02 21:10:33.494574
877	2026-05-23T00:00:00.000Z	Mcdbolanderna	-137.00	0	\N	19	2026-07-02 21:10:33.494574
879	2026-05-23T00:00:00.000Z	Pressbyran 4308139	-53.00	0	\N	19	2026-07-02 21:10:33.494574
880	2026-05-23T00:00:00.000Z	Överföring	-226.00	0	\N	19	2026-07-02 21:10:33.494574
881	2026-05-23T00:00:00.000Z	Överföring	-226.00	0	\N	19	2026-07-02 21:10:33.494574
882	2026-05-21T00:00:00.000Z	Faboden	-272.00	0	\N	19	2026-07-02 21:10:33.494574
883	2026-05-21T00:00:00.000Z	Maxi Ica Storm Gnist	-837.98	0	\N	19	2026-07-02 21:10:33.494574
884	2026-05-20T00:00:00.000Z	Lyssnaangen	-30.00	0	\N	19	2026-07-02 21:10:33.494574
885	2026-05-20T00:00:00.000Z	Mcdbolanderna	-85.00	0	\N	19	2026-07-02 21:10:33.494574
886	2026-05-19T00:00:00.000Z	Folksam Åter	102.00	0	\N	19	2026-07-02 21:10:33.494574
887	2026-05-18T00:00:00.000Z	Easypark	-46.38	0	\N	19	2026-07-02 21:10:33.494574
888	2026-05-17T00:00:00.000Z	Maxi Ica Storm Gnist	-411.54	0	\N	19	2026-07-02 21:10:33.494574
889	2026-05-17T00:00:00.000Z	Ica Årstahallen	-30.00	0	\N	19	2026-07-02 21:10:33.494574
890	2026-05-16T00:00:00.000Z	Överföring Till Ica Banks Konto	2000.00	0	\N	19	2026-07-02 21:10:33.494574
891	2026-05-16T00:00:00.000Z	Överföring	-1537.00	0	\N	19	2026-07-02 21:10:33.494574
892	2026-05-15T00:00:00.000Z	Ikea Uppsala Hfb Retur	499.00	0	\N	19	2026-07-02 21:10:33.494574
893	2026-05-15T00:00:00.000Z	Maxi Ica Storm Gnist	-419.99	0	\N	19	2026-07-02 21:10:33.494574
894	2026-05-15T00:00:00.000Z	Överföring Till Ica Banks Konto	2000.00	0	\N	19	2026-07-02 21:10:33.494574
895	2026-05-14T00:00:00.000Z	Hemkop Vasteras Oste	-23.05	0	\N	19	2026-07-02 21:10:33.494574
896	2026-05-14T00:00:00.000Z	Pressbyran 4308650	-32.00	0	\N	19	2026-07-02 21:10:33.494574
897	2026-05-13T00:00:00.000Z	Maxi Ica Storm Gnist	-309.89	0	\N	19	2026-07-02 21:10:33.494574
898	2026-05-13T00:00:00.000Z	Maxi Ica Storm Stenh	-168.90	0	\N	19	2026-07-02 21:10:33.494574
899	2026-05-13T00:00:00.000Z	Blomsterlandet	-138.90	0	\N	19	2026-07-02 21:10:33.494574
900	2026-05-13T00:00:00.000Z	Hårprylar	200.00	0	\N	19	2026-07-02 21:10:33.494574
901	2026-05-12T00:00:00.000Z	Överföring	-369.00	0	\N	19	2026-07-02 21:10:33.494574
902	2026-05-12T00:00:00.000Z	Netflix.Com	-109.00	0	\N	19	2026-07-02 21:10:33.494574
903	2026-05-11T00:00:00.000Z	Hemkop Uppsala Svava	-66.98	0	\N	19	2026-07-02 21:10:33.494574
904	2026-05-10T00:00:00.000Z	Maxi Ica Storm Gnist	-798.40	0	\N	19	2026-07-02 21:10:33.494574
905	2026-05-10T00:00:00.000Z	Överföring Till Ica Banks Konto	1000.00	0	\N	19	2026-07-02 21:10:33.494574
906	2026-05-09T00:00:00.000Z	St1 Ploq Stora Wasby S	-150.80	0	\N	19	2026-07-02 21:10:33.494574
907	2026-05-09T00:00:00.000Z	Easypark	-13.00	0	\N	19	2026-07-02 21:10:33.494574
908	2026-05-07T00:00:00.000Z	Bauhaus Uppsala	-131.76	0	\N	19	2026-07-02 21:10:33.494574
909	2026-05-07T00:00:00.000Z	Clas Ohlson 305	-219.50	0	\N	19	2026-07-02 21:10:33.494574
910	2026-05-07T00:00:00.000Z	Bauhaus Uppsala	-83.98	0	\N	19	2026-07-02 21:10:33.494574
911	2026-05-07T00:00:00.000Z	Bauhaus Uppsala	-598.75	0	\N	19	2026-07-02 21:10:33.494574
912	2026-05-07T00:00:00.000Z	Maxi Ica Storm Gnist	-598.14	0	\N	19	2026-07-02 21:10:33.494574
913	2026-05-06T00:00:00.000Z	Överföring Till Ica Banks Konto	1000.00	0	\N	19	2026-07-02 21:10:33.494574
914	2026-05-06T00:00:00.000Z	Överföring	-2000.00	0	\N	19	2026-07-02 21:10:33.494574
915	2026-05-05T00:00:00.000Z	Apotea.Se	-801.00	0	\N	19	2026-07-02 21:10:33.494574
916	2026-05-05T00:00:00.000Z	Easypark	-5.17	0	\N	19	2026-07-02 21:10:33.494574
917	2026-05-04T00:00:00.000Z	Ul  Region Uppsala	-40.00	0	\N	19	2026-07-02 21:10:33.494574
918	2026-05-04T00:00:00.000Z	Ica Årstahallen	-509.16	0	\N	19	2026-07-02 21:10:33.494574
919	2026-05-04T00:00:00.000Z	Överföring Till Ica Banks Konto	4000.00	0	\N	19	2026-07-02 21:10:33.494574
920	2026-05-04T00:00:00.000Z	Folksam	-235.00	0	\N	19	2026-07-02 21:10:33.494574
921	2026-05-04T00:00:00.000Z	Lf Uppsala	-220.00	0	\N	19	2026-07-02 21:10:33.494574
922	2026-05-04T00:00:00.000Z	Lf Uppsala	-141.00	0	\N	19	2026-07-02 21:10:33.494574
923	2026-05-04T00:00:00.000Z	Vattenfall	-590.95	0	\N	19	2026-07-02 21:10:33.494574
924	2026-05-02T00:00:00.000Z	Coop Stationsgallerian	-12.36	0	\N	19	2026-07-02 21:10:33.494574
925	2026-05-02T00:00:00.000Z	Sl	-86.00	0	\N	19	2026-07-02 21:10:33.494574
926	2026-05-02T00:00:00.000Z	Spotify P4208e3263	-189.00	0	\N	19	2026-07-02 21:10:33.494574
927	2026-05-01T00:00:00.000Z	Mcdbolanderna	-350.00	0	\N	19	2026-07-02 21:10:33.494574
928	2026-05-01T00:00:00.000Z	Lyssnaangen	-90.00	0	\N	19	2026-07-02 21:10:33.494574
929	2026-05-01T00:00:00.000Z	Loopia Ab	-12.49	0	\N	19	2026-07-02 21:10:33.494574
930	2026-05-01T00:00:00.000Z	Easypark	-13.50	0	\N	19	2026-07-02 21:10:33.494574
931	2026-04-30T00:00:00.000Z	Coop Stationsgallerian	-201.24	0	\N	19	2026-07-02 21:10:33.494574
932	2026-04-30T00:00:00.000Z	Csn	-1576.00	0	\N	19	2026-07-02 21:10:33.494574
933	2026-04-30T00:00:00.000Z	Sbab	-1380.00	0	\N	19	2026-07-02 21:10:33.494574
934	2026-04-30T00:00:00.000Z	Fastum Ubc	-4074.00	0	\N	19	2026-07-02 21:10:33.494574
935	2026-04-30T00:00:00.000Z	Csn	-1696.00	0	\N	19	2026-07-02 21:10:33.494574
936	2026-04-30T00:00:00.000Z	Unionen	-235.00	0	\N	19	2026-07-02 21:10:33.494574
937	2026-04-30T00:00:00.000Z	Unionen	-235.00	0	\N	19	2026-07-02 21:10:33.494574
938	2026-04-30T00:00:00.000Z	Sbab	-163.00	0	\N	19	2026-07-02 21:10:33.494574
939	2026-04-30T00:00:00.000Z	Folktandvård	-97.00	0	\N	19	2026-07-02 21:10:33.494574
940	2026-04-29T00:00:00.000Z	Bauhaus Uppsala	-957.95	0	\N	19	2026-07-02 21:10:33.494574
941	2026-04-29T00:00:00.000Z	Hemkop Uppsala Svava	-69.09	0	\N	19	2026-07-02 21:10:33.494574
942	2026-04-29T00:00:00.000Z	Maxi Ica Storm Gnist	-170.23	0	\N	19	2026-07-02 21:10:33.494574
943	2026-04-29T00:00:00.000Z	Trängselskat	-22.00	0	\N	19	2026-07-02 21:10:33.494574
944	2026-04-28T00:00:00.000Z	Okq8	-676.01	0	\N	19	2026-07-02 21:10:33.494574
945	2026-04-28T00:00:00.000Z	Comviq.Se	-428.00	0	\N	19	2026-07-02 21:10:33.494574
946	2026-04-28T00:00:00.000Z	Easypark	-26.75	0	\N	19	2026-07-02 21:10:33.494574
947	2026-04-28T00:00:00.000Z	Zoo.Se Uppsala	-239.00	0	\N	19	2026-07-02 21:10:33.494574
948	2026-04-28T00:00:00.000Z	Willys Uppsala Bjork	-664.83	0	\N	19	2026-07-02 21:10:33.494574
949	2026-04-28T00:00:00.000Z	Ica Försäkr	-639.00	0	\N	19	2026-07-02 21:10:33.494574
871	2026-05-25T00:00:00.000Z	Lön	2310.06	1	548	19	2026-07-02 21:10:33.494574
873	2026-05-24T00:00:00.000Z	Mcdbolanderna	-137.00	1	549	19	2026-07-02 21:10:33.494574
878	2026-05-23T00:00:00.000Z	City Gross Bolandern	-58.60	1	551	19	2026-07-02 21:10:33.494574
950	2026-04-28T00:00:00.000Z	Union.Akassa	-160.00	0	\N	19	2026-07-02 21:10:33.494574
951	2026-04-28T00:00:00.000Z	Djurens Rätt	-100.00	0	\N	19	2026-07-02 21:10:33.494574
952	2026-04-28T00:00:00.000Z	Union.Akassa	-160.00	0	\N	19	2026-07-02 21:10:33.494574
953	2026-04-27T00:00:00.000Z	Mcdbolanderna	-236.00	0	\N	19	2026-07-02 21:10:33.494574
954	2026-04-27T00:00:00.000Z	Willys Uppsala Stenh	-167.18	0	\N	19	2026-07-02 21:10:33.494574
955	2026-04-27T00:00:00.000Z	Rusta - 58 Uppsala Ste	-59.70	0	\N	19	2026-07-02 21:10:33.494574
956	2026-04-27T00:00:00.000Z	Region Uppsala 1656	-200.00	0	\N	19	2026-07-02 21:10:33.494574
957	2026-04-27T00:00:00.000Z	Överföring	-569.00	0	\N	19	2026-07-02 21:10:33.494574
958	2026-04-27T00:00:00.000Z	Avanza Bank	-1000.00	0	\N	19	2026-07-02 21:10:33.494574
959	2026-04-27T00:00:00.000Z	Avanza Bank	-1000.00	0	\N	19	2026-07-02 21:10:33.494574
960	2026-04-27T00:00:00.000Z	Agria	-112.00	0	\N	19	2026-07-02 21:10:33.494574
961	2026-04-27T00:00:00.000Z	Avgift Bankkort	-35.00	0	\N	19	2026-07-02 21:10:33.494574
962	2026-04-27T00:00:00.000Z	Avgift Bankkort	-35.00	0	\N	19	2026-07-02 21:10:33.494574
963	2026-04-26T00:00:00.000Z	Bauhaus Uppsala	-648.75	0	\N	19	2026-07-02 21:10:33.494574
964	2026-04-26T00:00:00.000Z	Easypark	-22.50	0	\N	19	2026-07-02 21:10:33.494574
965	2026-04-25T00:00:00.000Z	Ica Årstahallen	-209.13	0	\N	19	2026-07-02 21:10:33.494574
966	2026-04-25T00:00:00.000Z	Överföring	-8000.00	0	\N	19	2026-07-02 21:10:33.494574
967	2026-04-25T00:00:00.000Z	Överföring	-10000.00	0	\N	19	2026-07-02 21:10:33.494574
968	2026-04-24T00:00:00.000Z	Hemkop Uppsala Svava	-62.75	0	\N	19	2026-07-02 21:10:33.494574
969	2026-04-24T00:00:00.000Z	I00000389946	31916.34	0	\N	19	2026-07-02 21:10:33.494574
970	2026-04-24T00:00:00.000Z	Lön	6389.07	0	\N	19	2026-07-02 21:10:33.494574
971	2026-04-23T00:00:00.000Z	Hemkop Uppsala Svava	-70.50	0	\N	19	2026-07-02 21:10:33.494574
972	2026-04-23T00:00:00.000Z	Maxi Ica Storm Gnist	-29.76	0	\N	19	2026-07-02 21:10:33.494574
973	2026-04-23T00:00:00.000Z	Maxi Ica Storm Gnist	-1380.80	0	\N	19	2026-07-02 21:10:33.494574
974	2026-04-22T00:00:00.000Z	Bauhaus Uppsala	-530.14	0	\N	19	2026-07-02 21:10:33.494574
975	2026-04-22T00:00:00.000Z	Easypark	-19.00	0	\N	19	2026-07-02 21:10:33.494574
976	2026-04-21T00:00:00.000Z	Hemkop Uppsala Svava	-76.14	0	\N	19	2026-07-02 21:10:33.494574
977	2026-04-21T00:00:00.000Z	Ica Årstahallen	-51.64	0	\N	19	2026-07-02 21:10:33.494574
978	2026-04-20T00:00:00.000Z	Stora Coop Bolanderna	-29.88	0	\N	19	2026-07-02 21:10:33.494574
979	2026-04-19T00:00:00.000Z	Bauhaus Uppsala	-1889.42	0	\N	19	2026-07-02 21:10:33.494574
980	2026-04-19T00:00:00.000Z	Överföring Till Ica Banks Konto	3000.00	0	\N	19	2026-07-02 21:10:33.494574
981	2026-04-18T00:00:00.000Z	Zoo.Se Uppsala	-209.00	0	\N	19	2026-07-02 21:10:33.494574
982	2026-04-18T00:00:00.000Z	Sl	-86.00	0	\N	19	2026-07-02 21:10:33.494574
983	2026-04-18T00:00:00.000Z	Malardalstrafik	-226.00	0	\N	19	2026-07-02 21:10:33.494574
984	2026-04-18T00:00:00.000Z	Malardalstrafik	-226.00	0	\N	19	2026-07-02 21:10:33.494574
985	2026-04-18T00:00:00.000Z	Coop Storgatan	-37.50	0	\N	19	2026-07-02 21:10:33.494574
986	2026-04-18T00:00:00.000Z	Holy Greens Ab	-292.00	0	\N	19	2026-07-02 21:10:33.494574
987	2026-04-18T00:00:00.000Z	Pressbyran 4308650	-64.00	0	\N	19	2026-07-02 21:10:33.494574
988	2026-04-18T00:00:00.000Z	Maxi Ica Storm Gnist	-491.95	0	\N	19	2026-07-02 21:10:33.494574
989	2026-04-17T00:00:00.000Z	Easypark	-18.75	0	\N	19	2026-07-02 21:10:33.494574
990	2026-04-17T00:00:00.000Z	Ica Årstahallen	-278.90	0	\N	19	2026-07-02 21:10:33.494574
991	2026-04-16T00:00:00.000Z	Netonnet Ab Uppsala 10	-516.00	0	\N	19	2026-07-02 21:10:33.494574
992	2026-04-16T00:00:00.000Z	Ica Årstahallen	-77.46	0	\N	19	2026-07-02 21:10:33.494574
993	2026-04-16T00:00:00.000Z	Överföring Till Ica Banks Konto	250.00	0	\N	19	2026-07-02 21:10:33.494574
994	2026-04-15T00:00:00.000Z	Hemkop Uppsala Svava	-65.57	0	\N	19	2026-07-02 21:10:33.494574
995	2026-04-15T00:00:00.000Z	Easypark	-26.25	0	\N	19	2026-07-02 21:10:33.494574
996	2026-04-14T00:00:00.000Z	Normal Se0179 U	-221.00	0	\N	19	2026-07-02 21:10:33.494574
997	2026-04-14T00:00:00.000Z	Torgkassen Ab	-17.88	0	\N	19	2026-07-02 21:10:33.494574
998	2026-04-13T00:00:00.000Z	Malardalstrafik	-113.00	0	\N	19	2026-07-02 21:10:33.494574
999	2026-04-13T00:00:00.000Z	Malardalstrafik	-113.00	0	\N	19	2026-07-02 21:10:33.494574
1000	2026-04-12T00:00:00.000Z	Netflix.Com	-109.00	0	\N	19	2026-07-02 21:10:33.494574
1001	2026-04-12T00:00:00.000Z	Maxi Ica Storm Gnist	-1200.81	0	\N	19	2026-07-02 21:10:33.494574
1002	2026-04-11T00:00:00.000Z	Ubr  Pending.Uber.Com	-80.00	0	\N	19	2026-07-02 21:10:33.494574
1003	2026-04-11T00:00:00.000Z	Ubr  Pending.Uber.Com	-96.00	0	\N	19	2026-07-02 21:10:33.494574
1004	2026-04-11T00:00:00.000Z	Maxi Ica Storm Gnist	-696.58	0	\N	19	2026-07-02 21:10:33.494574
1005	2026-04-10T00:00:00.000Z	Systembolaget	-348.00	0	\N	19	2026-07-02 21:10:33.494574
1006	2026-04-10T00:00:00.000Z	Easypark	-15.50	0	\N	19	2026-07-02 21:10:33.494574
1007	2026-04-10T00:00:00.000Z	Circle K Uppsala Rapsg	-705.68	0	\N	19	2026-07-02 21:10:33.494574
1008	2026-04-10T00:00:00.000Z	Clas Ohlson 305	-79.80	0	\N	19	2026-07-02 21:10:33.494574
1009	2026-04-10T00:00:00.000Z	Maxi Ica Storm Gnist	-1391.29	0	\N	19	2026-07-02 21:10:33.494574
1010	2026-04-09T00:00:00.000Z	Ica Årstahallen	-307.84	0	\N	19	2026-07-02 21:10:33.494574
1011	2026-04-08T00:00:00.000Z	Max Burgers 2010053 Ec	-99.00	0	\N	19	2026-07-02 21:10:33.494574
1012	2026-04-08T00:00:00.000Z	Bacan	-611.10	0	\N	19	2026-07-02 21:10:33.494574
1013	2026-04-08T00:00:00.000Z	Kaliber Bar	-69.00	0	\N	19	2026-07-02 21:10:33.494574
1014	2026-04-08T00:00:00.000Z	Ul  Region Uppsala	-40.00	0	\N	19	2026-07-02 21:10:33.494574
1015	2026-04-08T00:00:00.000Z	Ul  Region Uppsala	-40.00	0	\N	19	2026-07-02 21:10:33.494574
1016	2026-04-06T00:00:00.000Z	Maxi Ica Storm Stenh	-245.05	0	\N	19	2026-07-02 21:10:33.494574
1017	2026-04-05T00:00:00.000Z	Ragusa	-255.00	0	\N	19	2026-07-02 21:10:33.494574
1018	2026-04-05T00:00:00.000Z	Easypark	-22.25	0	\N	19	2026-07-02 21:10:33.494574
1019	2026-04-04T00:00:00.000Z	Nyx Impactsolutionswed	-25.00	0	\N	19	2026-07-02 21:10:33.494574
1020	2026-04-03T00:00:00.000Z	Maxi Ica Storm Stenh	-15.05	0	\N	19	2026-07-02 21:10:33.494574
1021	2026-04-03T00:00:00.000Z	Maxi Ica Storm Stenh	-196.75	0	\N	19	2026-07-02 21:10:33.494574
1022	2026-04-02T00:00:00.000Z	Ica Årstahallen	-137.42	0	\N	19	2026-07-02 21:10:33.494574
1023	2026-04-02T00:00:00.000Z	Circle K Uppsala Berby	-29.00	0	\N	19	2026-07-02 21:10:33.494574
1024	2026-04-02T00:00:00.000Z	Ellos Ab	399.20	0	\N	19	2026-07-02 21:10:33.494574
1025	2026-04-02T00:00:00.000Z	Spotify P410a7e2f3	-189.00	0	\N	19	2026-07-02 21:10:33.494574
1026	2026-04-01T00:00:00.000Z	Loopia Ab	-12.49	0	\N	19	2026-07-02 21:10:33.494574
1027	2026-04-01T00:00:00.000Z	Folksam	-235.00	0	\N	19	2026-07-02 21:10:33.494574
1028	2026-04-01T00:00:00.000Z	Lf Uppsala	-226.00	0	\N	19	2026-07-02 21:10:33.494574
1029	2026-04-01T00:00:00.000Z	Lf Uppsala	-141.00	0	\N	19	2026-07-02 21:10:33.494574
1030	2026-03-31T00:00:00.000Z	Ul  Region Uppsala	-80.00	0	\N	19	2026-07-02 21:10:33.494574
1031	2026-03-31T00:00:00.000Z	Ul  Region Uppsala	-40.00	0	\N	19	2026-07-02 21:10:33.494574
1032	2026-03-31T00:00:00.000Z	Hemkop Uppsala Svava	-39.49	0	\N	19	2026-07-02 21:10:33.494574
1033	2026-03-31T00:00:00.000Z	Pocket Shop Uppsala	-349.00	0	\N	19	2026-07-02 21:10:33.494574
1034	2026-03-31T00:00:00.000Z	Apotea.Se	-897.49	0	\N	19	2026-07-02 21:10:33.494574
1035	2026-03-31T00:00:00.000Z	Överföring	-300.00	0	\N	19	2026-07-02 21:10:33.494574
1037	2026-03-31T00:00:00.000Z	Unionen	-235.00	0	\N	19	2026-07-02 21:10:33.494574
1038	2026-03-31T00:00:00.000Z	Csn	-1696.00	0	\N	19	2026-07-02 21:10:33.494574
1039	2026-03-31T00:00:00.000Z	Vattenfall	-547.44	0	\N	19	2026-07-02 21:10:33.494574
1040	2026-03-31T00:00:00.000Z	Csn	-1576.00	0	\N	19	2026-07-02 21:10:33.494574
1041	2026-03-31T00:00:00.000Z	Unionen	-235.00	0	\N	19	2026-07-02 21:10:33.494574
1042	2026-03-31T00:00:00.000Z	Folktandvård	-72.00	0	\N	19	2026-07-02 21:10:33.494574
1043	2026-03-30T00:00:00.000Z	Desenio.Se	-415.20	0	\N	19	2026-07-02 21:10:33.494574
1048	2026-03-30T00:00:00.000Z	Djurens Rätt	-100.00	0	\N	19	2026-07-02 21:10:33.494574
1050	2026-03-29T00:00:00.000Z	Clas Ohlson 305	319.40	0	\N	19	2026-07-02 21:10:33.494574
1052	2026-03-29T00:00:00.000Z	Överföring Till Ica Banks Konto	800.00	0	\N	19	2026-07-02 21:10:33.494574
1049	2026-03-29T00:00:00.000Z	Ikea Barkarby Hfb Eco	-1945.00	1	521	19	2026-07-02 21:10:33.494574
1051	2026-03-29T00:00:00.000Z	Max Burgers 2010077 Ki	-209.00	1	522	19	2026-07-02 21:10:33.494574
1044	2026-03-30T00:00:00.000Z	Sbab	-1380.00	1	523	19	2026-07-02 21:10:33.494574
1046	2026-03-30T00:00:00.000Z	Sbab	-173.00	1	524	19	2026-07-02 21:10:33.494574
1047	2026-03-30T00:00:00.000Z	Union.Akassa	-160.00	1	525	19	2026-07-02 21:10:33.494574
1045	2026-03-30T00:00:00.000Z	Union.Akassa	-160.00	1	526	19	2026-07-02 21:10:33.494574
1036	2026-03-31T00:00:00.000Z	Fastum Ubc	-4074.00	1	527	19	2026-07-02 21:10:33.494574
819	2026-06-05T00:00:00.000Z	Sl	-43.00	1	528	19	2026-07-02 21:10:33.494574
822	2026-06-03T00:00:00.000Z	Maxi Ica Storm Gnist	-721.91	1	529	19	2026-07-02 21:10:33.494574
846	2026-05-29T00:00:00.000Z	Fastum Ubc	-4074.00	1	541	19	2026-07-02 21:10:33.494574
870	2026-05-25T00:00:00.000Z	I00000393422	32304.00	1	547	19	2026-07-02 21:10:33.494574
874	2026-05-24T00:00:00.000Z	Maxi Ica Storm Gnist	-148.43	1	550	19	2026-07-02 21:10:33.494574
\.


--
-- Data for Name: booking_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.booking_templates (id, namn, created_at) FROM stdin;
1	Lön	2025-12-22 21:38:13.008149
2	Handla i matbutik	2025-12-22 21:38:39.938561
3	Resor	2025-12-22 22:13:59.116358
4	Prenumeration	2025-12-22 22:19:08.809523
5	Djurförsäkring	2025-12-22 22:19:36.738188
6	Bolåneränta	2025-12-22 22:30:25.266401
7	Avbetalning studielån	2025-12-22 22:37:05.648618
8	Facket/A-kassa	2025-12-22 22:56:53.871221
9	Pension	2025-12-22 23:15:28.501838
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budgets (id, account_id, year, month, amount, created_at, updated_at) FROM stdin;
1	1	2026	1	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
2	1	2026	2	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
3	1	2026	3	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
4	1	2026	4	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
5	1	2026	5	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
6	1	2026	6	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
7	1	2026	7	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
8	1	2026	8	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
9	1	2026	9	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
10	1	2026	10	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
11	1	2026	11	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
12	1	2026	12	500.00	2026-01-01 20:58:48.250369	2026-01-01 20:58:48.250369
13	2	2026	1	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
14	2	2026	2	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
15	2	2026	3	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
16	2	2026	4	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
17	2	2026	5	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
18	2	2026	6	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
19	2	2026	7	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
20	2	2026	8	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
21	2	2026	9	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
22	2	2026	10	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
23	2	2026	11	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
24	2	2026	12	639.00	2026-01-01 20:59:19.305183	2026-01-01 20:59:19.305183
25	40	2026	1	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
26	40	2026	2	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
27	40	2026	3	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
28	40	2026	4	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
29	40	2026	5	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
30	40	2026	6	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
31	40	2026	7	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
32	40	2026	8	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
33	40	2026	9	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
34	40	2026	10	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
35	40	2026	11	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
36	40	2026	12	25.00	2026-01-01 20:59:40.661286	2026-01-01 20:59:40.661286
37	8	2026	1	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
38	8	2026	2	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
39	8	2026	3	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
40	8	2026	4	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
41	8	2026	5	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
42	8	2026	6	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
43	8	2026	7	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
44	8	2026	8	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
45	8	2026	9	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
46	8	2026	10	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
47	8	2026	11	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
48	8	2026	12	250.00	2026-01-01 20:59:52.893555	2026-01-01 20:59:52.893555
49	41	2026	1	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
50	41	2026	2	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
51	41	2026	3	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
52	41	2026	4	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
53	41	2026	5	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
54	41	2026	6	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
55	41	2026	7	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
56	41	2026	8	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
57	41	2026	9	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
58	41	2026	10	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
59	41	2026	11	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
60	41	2026	12	0.00	2026-01-01 21:01:23.333135	2026-01-01 21:01:23.333135
73	6	2026	1	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
74	6	2026	2	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
75	6	2026	3	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
76	6	2026	4	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
77	6	2026	5	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
78	6	2026	6	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
79	6	2026	7	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
80	6	2026	8	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
81	6	2026	9	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
82	6	2026	10	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
83	6	2026	11	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
84	6	2026	12	700.00	2026-01-01 21:02:41.062963	2026-01-01 21:02:41.062963
97	18	2026	1	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
98	18	2026	2	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
99	18	2026	3	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
100	18	2026	4	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
101	18	2026	5	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
102	18	2026	6	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
103	18	2026	7	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
104	18	2026	8	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
105	18	2026	9	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
106	18	2026	10	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
107	18	2026	11	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
108	18	2026	12	100.00	2026-01-01 21:03:13.136209	2026-01-01 21:03:13.136209
109	19	2026	1	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
110	19	2026	2	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
111	19	2026	3	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
112	19	2026	4	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
113	19	2026	5	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
114	19	2026	6	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
115	19	2026	7	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
116	19	2026	8	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
117	19	2026	9	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
118	19	2026	10	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
119	19	2026	11	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
120	19	2026	12	4074.00	2026-01-01 21:03:33.15112	2026-01-01 21:03:33.15112
61	5	2026	1	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
62	5	2026	2	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
63	5	2026	3	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
64	5	2026	4	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
65	5	2026	5	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
66	5	2026	6	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
67	5	2026	7	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
68	5	2026	8	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
69	5	2026	9	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
70	5	2026	10	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
71	5	2026	11	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
121	20	2026	1	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
122	20	2026	2	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
123	20	2026	3	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
124	20	2026	4	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
125	20	2026	5	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
126	20	2026	6	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
127	20	2026	7	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
128	20	2026	8	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
129	20	2026	9	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
130	20	2026	10	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
131	20	2026	11	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
132	20	2026	12	1700.00	2026-01-01 21:04:29.716181	2026-01-01 21:04:29.716181
133	21	2026	1	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
134	21	2026	2	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
135	21	2026	3	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
136	21	2026	4	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
137	21	2026	5	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
138	21	2026	6	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
139	21	2026	7	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
140	21	2026	8	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
141	21	2026	9	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
142	21	2026	10	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
143	21	2026	11	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
144	21	2026	12	500.00	2026-01-01 21:04:44.196868	2026-01-01 21:04:44.196868
145	7	2026	1	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
146	7	2026	2	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
147	7	2026	3	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
148	7	2026	4	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
149	7	2026	5	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
150	7	2026	6	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
151	7	2026	7	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
152	7	2026	8	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
153	7	2026	9	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
154	7	2026	10	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
155	7	2026	11	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
156	7	2026	12	5000.00	2026-01-01 21:05:04.771706	2026-01-01 21:05:04.771706
193	16	2026	1	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
194	16	2026	2	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
195	16	2026	3	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
196	16	2026	4	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
197	16	2026	5	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
198	16	2026	6	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
199	16	2026	7	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
200	16	2026	8	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
201	16	2026	9	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
202	16	2026	10	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
203	16	2026	11	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
204	16	2026	12	500.00	2026-01-01 21:06:19.823362	2026-01-01 21:06:19.823362
205	26	2026	1	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
206	26	2026	2	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
207	26	2026	3	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
208	26	2026	4	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
209	26	2026	5	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
210	26	2026	6	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
211	26	2026	7	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
212	26	2026	8	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
213	26	2026	9	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
214	26	2026	10	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
215	26	2026	11	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
216	26	2026	12	790.00	2026-01-01 21:06:41.813408	2026-01-01 21:06:41.813408
217	38	2026	1	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
218	38	2026	2	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
219	38	2026	3	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
220	38	2026	4	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
221	38	2026	5	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
222	38	2026	6	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
223	38	2026	7	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
224	38	2026	8	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
225	38	2026	9	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
226	38	2026	10	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
227	38	2026	11	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
228	38	2026	12	470.00	2026-01-01 22:43:25.344387	2026-01-01 22:43:25.344387
229	15	2026	1	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
230	15	2026	2	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
231	15	2026	3	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
232	15	2026	4	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
233	15	2026	5	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
234	15	2026	6	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
235	15	2026	7	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
236	15	2026	8	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
237	15	2026	9	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
238	15	2026	10	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
239	15	2026	11	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
240	15	2026	12	800.00	2026-01-01 23:13:02.671621	2026-01-01 23:13:02.671621
169	29	2026	1	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
170	29	2026	2	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
171	29	2026	3	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
172	29	2026	4	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
173	29	2026	5	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
174	29	2026	6	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
175	29	2026	7	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
176	29	2026	8	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
177	29	2026	9	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
178	29	2026	10	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
179	29	2026	11	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
157	30	2026	1	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
158	30	2026	2	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
159	30	2026	3	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
160	30	2026	4	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
161	30	2026	5	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
162	30	2026	6	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
163	30	2026	7	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
164	30	2026	8	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
165	30	2026	9	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
166	30	2026	10	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
167	30	2026	11	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
253	22	2026	1	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
254	22	2026	2	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
255	22	2026	3	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
256	22	2026	4	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
257	22	2026	5	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
258	22	2026	6	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
259	22	2026	7	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
260	22	2026	8	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
261	22	2026	9	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
262	22	2026	10	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
263	22	2026	11	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
264	22	2026	12	100.00	2026-01-01 23:14:27.842419	2026-01-01 23:14:27.842419
265	23	2026	1	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
266	23	2026	2	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
267	23	2026	3	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
268	23	2026	4	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
269	23	2026	5	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
270	23	2026	6	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
271	23	2026	7	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
272	23	2026	8	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
273	23	2026	9	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
274	23	2026	10	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
275	23	2026	11	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
276	23	2026	12	428.00	2026-01-01 23:14:53.397504	2026-01-01 23:14:53.397504
277	24	2026	1	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
278	24	2026	2	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
279	24	2026	3	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
280	24	2026	4	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
281	24	2026	5	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
282	24	2026	6	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
283	24	2026	7	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
284	24	2026	8	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
285	24	2026	9	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
286	24	2026	10	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
287	24	2026	11	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
288	24	2026	12	1500.00	2026-01-01 23:15:29.106931	2026-01-01 23:15:29.106931
301	2	2025	1	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
302	2	2025	2	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
303	2	2025	3	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
304	2	2025	4	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
305	2	2025	5	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
306	2	2025	6	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
307	2	2025	7	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
308	2	2025	8	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
309	2	2025	9	0.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
310	2	2025	10	639.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
311	2	2025	11	639.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
313	40	2025	1	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
314	40	2025	2	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
315	40	2025	3	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
316	40	2025	4	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
317	40	2025	5	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
318	40	2025	6	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
319	40	2025	7	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
320	40	2025	8	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
321	40	2025	9	0.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
322	40	2025	10	25.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
323	40	2025	11	25.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
325	8	2025	1	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
326	8	2025	2	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
327	8	2025	3	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
328	8	2025	4	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
329	8	2025	5	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
330	8	2025	6	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
331	8	2025	7	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
332	8	2025	8	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
333	8	2025	9	0.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
334	8	2025	10	250.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
335	8	2025	11	250.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
336	8	2025	12	250.00	2026-01-02 00:33:57.937241	2026-01-02 00:36:59.622865
337	5	2025	1	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
338	5	2025	2	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
339	5	2025	3	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
340	5	2025	4	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
341	5	2025	5	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
342	5	2025	6	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
343	5	2025	7	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
344	5	2025	8	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
345	5	2025	9	0.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
346	5	2025	10	600.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
347	5	2025	11	600.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
349	6	2025	1	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
350	6	2025	2	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
351	6	2025	3	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
352	6	2025	4	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
353	6	2025	5	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
354	6	2025	6	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
355	6	2025	7	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
356	6	2025	8	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
357	6	2025	9	0.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
358	6	2025	10	700.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
359	6	2025	11	700.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
241	25	2026	1	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
242	25	2026	2	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
243	25	2026	3	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
244	25	2026	4	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
245	25	2026	5	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
246	25	2026	6	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
247	25	2026	7	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
248	25	2026	8	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
249	25	2026	9	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
250	25	2026	10	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
251	25	2026	11	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
289	1	2025	1	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
290	1	2025	2	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
291	1	2025	3	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
292	1	2025	4	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
293	1	2025	5	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
294	1	2025	6	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
295	1	2025	7	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
296	1	2025	8	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
297	1	2025	9	0.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
298	1	2025	10	500.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
299	1	2025	11	500.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
300	1	2025	12	500.00	2026-01-02 00:33:21.926016	2026-01-02 00:36:33.047815
312	2	2025	12	639.00	2026-01-02 00:33:26.982449	2026-01-02 00:36:40.55094
324	40	2025	12	25.00	2026-01-02 00:33:31.094789	2026-01-02 00:36:49.245985
348	5	2025	12	600.00	2026-01-02 00:34:08.364617	2026-01-02 00:37:06.891389
360	6	2025	12	700.00	2026-01-02 00:34:16.262803	2026-01-02 00:37:14.196532
361	17	2025	1	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
362	17	2025	2	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
363	17	2025	3	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
364	17	2025	4	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
365	17	2025	5	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
366	17	2025	6	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
367	17	2025	7	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
368	17	2025	8	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
369	17	2025	9	0.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
370	17	2025	10	300.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
371	17	2025	11	300.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
372	17	2025	12	300.00	2026-01-02 00:35:00.493096	2026-01-02 00:37:22.18728
373	18	2025	1	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
374	18	2025	2	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
375	18	2025	3	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
376	18	2025	4	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
377	18	2025	5	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
378	18	2025	6	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
379	18	2025	7	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
380	18	2025	8	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
381	18	2025	9	0.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
382	18	2025	10	100.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
383	18	2025	11	100.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
384	18	2025	12	100.00	2026-01-02 00:35:07.761715	2026-01-02 00:37:29.057322
385	20	2025	1	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
386	20	2025	2	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
387	20	2025	3	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
388	20	2025	4	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
389	20	2025	5	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
390	20	2025	6	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
391	20	2025	7	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
392	20	2025	8	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
393	20	2025	9	0.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
394	20	2025	10	1700.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
395	20	2025	11	1700.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
396	20	2025	12	1700.00	2026-01-02 00:35:21.091805	2026-01-02 00:37:35.718531
397	21	2025	1	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
398	21	2025	2	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
399	21	2025	3	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
400	21	2025	4	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
401	21	2025	5	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
402	21	2025	6	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
403	21	2025	7	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
404	21	2025	8	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
405	21	2025	9	0.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
406	21	2025	10	500.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
407	21	2025	11	500.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
408	21	2025	12	500.00	2026-01-02 00:35:26.970909	2026-01-02 00:37:43.094998
409	19	2025	1	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
410	19	2025	2	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
411	19	2025	3	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
412	19	2025	4	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
413	19	2025	5	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
414	19	2025	6	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
415	19	2025	7	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
416	19	2025	8	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
417	19	2025	9	0.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
418	19	2025	10	4000.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
419	19	2025	11	4000.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
420	19	2025	12	4000.00	2026-01-02 00:35:46.08015	2026-01-02 00:37:50.464899
421	24	2025	1	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
422	24	2025	2	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
423	24	2025	3	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
424	24	2025	4	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
425	24	2025	5	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
426	24	2025	6	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
427	24	2025	7	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
428	24	2025	8	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
429	24	2025	9	0.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
430	24	2025	10	1500.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
431	24	2025	11	1500.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
432	24	2025	12	1500.00	2026-01-02 00:35:51.399413	2026-01-02 00:37:57.207
433	7	2025	1	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
434	7	2025	2	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
435	7	2025	3	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
436	7	2025	4	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
437	7	2025	5	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
438	7	2025	6	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
439	7	2025	7	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
440	7	2025	8	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
441	7	2025	9	0.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
442	7	2025	10	5000.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
443	7	2025	11	5000.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
444	7	2025	12	5000.00	2026-01-02 00:35:57.552412	2026-01-02 00:38:03.502044
601	30	2025	1	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
602	30	2025	2	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
603	30	2025	3	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
604	30	2025	4	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
605	30	2025	5	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
606	30	2025	6	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
607	30	2025	7	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
608	30	2025	8	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
609	30	2025	9	0.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
610	30	2025	10	7000.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
611	30	2025	11	7000.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
612	30	2025	12	7000.00	2026-01-02 00:38:28.448853	2026-01-02 00:38:28.448853
613	29	2025	1	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
614	29	2025	2	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
615	29	2025	3	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
616	29	2025	4	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
617	29	2025	5	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
618	29	2025	6	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
619	29	2025	7	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
620	29	2025	8	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
621	29	2025	9	0.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
622	29	2025	10	7000.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
623	29	2025	11	7000.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
624	29	2025	12	7000.00	2026-01-02 00:38:41.62622	2026-01-02 00:38:41.62622
625	14	2025	1	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
626	14	2025	2	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
627	14	2025	3	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
628	14	2025	4	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
629	14	2025	5	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
630	14	2025	6	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
631	14	2025	7	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
632	14	2025	8	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
633	14	2025	9	0.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
634	14	2025	10	380.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
635	14	2025	11	380.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
636	14	2025	12	380.00	2026-01-02 00:38:56.16901	2026-01-02 00:38:56.16901
637	16	2025	1	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
638	16	2025	2	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
639	16	2025	3	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
640	16	2025	4	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
641	16	2025	5	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
642	16	2025	6	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
643	16	2025	7	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
644	16	2025	8	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
645	16	2025	9	0.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
646	16	2025	10	500.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
647	16	2025	11	500.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
648	16	2025	12	500.00	2026-01-02 00:39:07.523907	2026-01-02 00:39:07.523907
661	38	2025	1	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
662	38	2025	2	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
663	38	2025	3	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
664	38	2025	4	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
665	38	2025	5	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
666	38	2025	6	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
667	38	2025	7	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
668	38	2025	8	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
669	38	2025	9	0.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
670	38	2025	10	470.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
671	38	2025	11	470.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
672	38	2025	12	470.00	2026-01-02 00:39:46.166873	2026-01-02 00:39:46.166873
685	22	2025	1	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
686	22	2025	2	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
687	22	2025	3	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
688	22	2025	4	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
689	22	2025	5	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
690	22	2025	6	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
691	22	2025	7	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
692	22	2025	8	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
693	22	2025	9	0.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
694	22	2025	10	100.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
695	22	2025	11	100.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
696	22	2025	12	100.00	2026-01-02 00:40:09.121491	2026-01-02 00:40:09.121491
697	25	2025	1	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
698	25	2025	2	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
699	25	2025	3	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
700	25	2025	4	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
701	25	2025	5	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
702	25	2025	6	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
703	25	2025	7	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
704	25	2025	8	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
705	25	2025	9	0.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
706	25	2025	10	1600.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
707	25	2025	11	1600.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
708	25	2025	12	1600.00	2026-01-02 00:40:30.931186	2026-01-02 00:40:30.931186
709	15	2025	1	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
710	15	2025	2	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
711	15	2025	3	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
712	15	2025	4	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
713	15	2025	5	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
714	15	2025	6	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
715	15	2025	7	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
716	15	2025	8	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
717	15	2025	9	0.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
718	15	2025	10	800.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
719	15	2025	11	800.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
720	15	2025	12	800.00	2026-01-02 00:40:39.638361	2026-01-02 00:40:39.638361
649	26	2025	1	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
650	26	2025	2	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
651	26	2025	3	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
652	26	2025	4	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
653	26	2025	5	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
654	26	2025	6	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
655	26	2025	7	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
656	26	2025	8	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
657	26	2025	9	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
658	26	2025	10	0.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
659	26	2025	11	790.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
660	26	2025	12	790.00	2026-01-02 00:39:23.38833	2026-01-02 00:44:32.168857
673	23	2025	1	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
674	23	2025	2	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
675	23	2025	3	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
676	23	2025	4	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
677	23	2025	5	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
678	23	2025	6	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
679	23	2025	7	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
680	23	2025	8	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
681	23	2025	9	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
682	23	2025	10	0.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
683	23	2025	11	428.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
684	23	2025	12	428.00	2026-01-02 00:39:58.962515	2026-01-02 00:46:57.514368
252	25	2026	12	3300.00	2026-01-01 23:14:17.092664	2026-01-11 11:15:27.391475
781	27	2026	1	-15000.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
782	27	2026	2	-15000.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
783	27	2026	3	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
784	27	2026	4	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
785	27	2026	5	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
786	27	2026	6	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
787	27	2026	7	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
788	27	2026	8	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
789	27	2026	9	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
790	27	2026	10	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
791	27	2026	11	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
792	27	2026	12	0.00	2026-01-10 19:58:45.004242	2026-01-10 19:58:45.004242
793	28	2026	1	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
794	28	2026	2	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
795	28	2026	3	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
796	28	2026	4	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
797	28	2026	5	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
798	28	2026	6	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
799	28	2026	7	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
800	28	2026	8	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
801	28	2026	9	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
802	28	2026	10	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
803	28	2026	11	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
804	28	2026	12	2000.00	2026-01-10 19:59:27.347274	2026-01-10 19:59:27.347274
181	14	2026	1	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
182	14	2026	2	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
183	14	2026	3	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
184	14	2026	4	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
185	14	2026	5	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
186	14	2026	6	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
187	14	2026	7	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
188	14	2026	8	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
189	14	2026	9	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
190	14	2026	10	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
191	14	2026	11	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
192	14	2026	12	440.00	2026-01-01 21:06:02.753243	2026-01-11 14:06:11.783666
841	47	2026	1	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
842	47	2026	2	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
843	47	2026	3	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
844	47	2026	4	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
845	47	2026	5	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
846	47	2026	6	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
847	47	2026	7	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
848	47	2026	8	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
849	47	2026	9	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
850	47	2026	10	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
851	47	2026	11	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
852	47	2026	12	141.00	2026-01-12 19:58:38.848415	2026-01-12 19:58:38.848415
85	17	2026	1	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
86	17	2026	2	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
87	17	2026	3	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
88	17	2026	4	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
89	17	2026	5	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
90	17	2026	6	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
91	17	2026	7	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
92	17	2026	8	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
93	17	2026	9	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
94	17	2026	10	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
95	17	2026	11	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
96	17	2026	12	0.00	2026-01-01 21:03:01.512613	2026-01-19 10:32:26.03848
901	36	2026	1	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
902	36	2026	2	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
903	36	2026	3	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
904	36	2026	4	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
905	36	2026	5	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
906	36	2026	6	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
907	36	2026	7	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
908	36	2026	8	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
909	36	2026	9	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
910	36	2026	10	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
911	36	2026	11	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
912	36	2026	12	350.00	2026-01-19 10:35:27.833639	2026-01-19 10:35:27.833639
72	5	2026	12	300.00	2026-01-01 21:02:21.595785	2026-01-19 10:37:34.425725
757	13	2026	1	59112.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
758	13	2026	2	31500.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
759	13	2026	3	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
760	13	2026	4	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
761	13	2026	5	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
762	13	2026	6	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
763	13	2026	7	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
764	13	2026	8	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
765	13	2026	9	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
766	13	2026	10	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
767	13	2026	11	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
768	13	2026	12	33988.00	2026-01-09 15:07:10.648164	2026-01-22 19:21:04.548896
168	30	2026	12	4000.00	2026-01-01 21:05:11.546166	2026-01-23 10:00:12.194986
180	29	2026	12	4000.00	2026-01-01 21:05:21.980271	2026-01-23 10:00:18.581423
829	46	2026	1	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
830	46	2026	2	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
831	46	2026	3	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
832	46	2026	4	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
833	46	2026	5	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
834	46	2026	6	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
835	46	2026	7	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
836	46	2026	8	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
837	46	2026	9	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
838	46	2026	10	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
839	46	2026	11	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
840	46	2026	12	288.00	2026-01-12 19:57:43.187326	2026-01-23 10:23:58.127142
\.


--
-- Data for Name: custom_result_view_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_result_view_accounts (id, view_id, account_id, created_at) FROM stdin;
\.


--
-- Data for Name: custom_result_view_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_result_view_groups (id, view_id, group_id, created_at) FROM stdin;
\.


--
-- Data for Name: custom_result_view_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_result_view_types (id, view_id, account_type, created_at) FROM stdin;
\.


--
-- Data for Name: custom_result_views; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_result_views (id, namn, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, namn, typ, created_at) FROM stdin;
1	Likvida medel	Tillgång	2025-12-22 21:30:51.265437
2	Inkomster	Intäkt	2025-12-22 21:31:01.691084
3	Hushåll	Utgift	2025-12-22 21:31:12.302675
4	Bil	Utgift	2025-12-22 21:31:15.876374
5	Djur	Utgift	2025-12-22 21:31:18.446935
6	Nöje	Utgift	2025-12-22 22:09:35.624105
8	Transport	Utgift	2025-12-22 22:13:18.865797
9	Gåvor	Utgift	2025-12-22 22:17:06.077092
10	Person och hälsa	Utgift	2025-12-22 22:27:53.668594
11	Studielån	Utgift	2025-12-22 22:36:19.447585
12	Lån	Skuld	2025-12-22 23:02:53.271856
13	Långsiktigt sparande	Tillgång	2025-12-22 23:07:34.860477
14	Månadspeng	Utgift	2025-12-22 23:12:42.847104
15	Interna lån	Skuld	2025-12-22 23:22:30.419325
16	Övriga kostnader	Utgift	2025-12-22 23:27:50.203375
17	Fordringar	Tillgång	2026-01-01 17:33:08.011622
\.


--
-- Data for Name: imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.imports (id, filename, imported_at, total_events, date_range_start, date_range_end, account_id) FROM stdin;
1	Kontohändelser2025-12-22(1).csv	2025-12-22 21:27:40.035492	213	2025-10-03T00:00:00.000Z	2025-12-22T00:00:00.000Z	\N
2	Kontohändelser2025-12-24(1).csv	2025-12-23 23:32:49.38132	5	2025-12-23T00:00:00.000Z	2025-12-23T00:00:00.000Z	\N
4	Kontohändelser2025-12-26(1).csv	2025-12-26 21:06:46.474244	6	2025-12-24T00:00:00.000Z	2025-12-26T00:00:00.000Z	\N
5	Kontohändelser2025-12-29(1).csv	2025-12-29 14:57:51.853511	17	2025-12-27T00:00:00.000Z	2025-12-29T00:00:00.000Z	\N
8	Kontohändelser2026-01-01.csv	2026-01-01 14:16:11.701127	11	2025-12-30T00:00:00.000Z	2026-01-01T00:00:00.000Z	9
9	Kontohändelser2026-01-07.csv	2026-01-07 00:44:35.598255	8	2026-01-02T00:00:00.000Z	2026-01-07T00:00:00.000Z	9
10	Kontohändelser2026-01-11.csv	2026-01-11 12:11:21.358286	3	2026-01-08T00:00:00.000Z	2026-01-11T00:00:00.000Z	9
11	Kontohändelser2026-01-19.csv	2026-01-19 22:35:11.261707	21	2026-01-11T00:00:00.000Z	2026-01-19T00:00:00.000Z	9
12	Kontohändelser2026-01-23.csv	2026-01-23 09:44:58.139576	7	2026-01-20T00:00:00.000Z	2026-01-23T00:00:00.000Z	9
14	Kontohändelser2026-01-26(2).csv	2026-01-26 08:45:09.423568	12	2026-01-23T00:00:00.000Z	2026-01-26T00:00:00.000Z	9
15	Kontohändelser2026-02-04.csv	2026-02-04 16:07:12.194799	33	2026-01-27T00:00:00.000Z	2026-02-04T00:00:00.000Z	9
16	Kontohändelser2026-02-16.csv	2026-02-16 13:53:04.002216	19	2026-02-05T00:00:00.000Z	2026-02-15T00:00:00.000Z	9
17	Kontohändelser2026-03-04.csv	2026-03-04 11:56:37.46327	53	2026-02-16T00:00:00.000Z	2026-03-04T00:00:00.000Z	9
18	Kontohändelser2026-03-28.csv	2026-03-28 21:54:40.149052	63	2026-03-05T00:00:00.000Z	2026-03-28T00:00:00.000Z	9
19	Kontohändelser2026-07-02.csv	2026-07-02 21:10:33.494574	328	2026-03-29T00:00:00.000Z	2026-07-02T00:00:00.000Z	9
\.


--
-- Data for Name: period_locks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.period_locks (id, year, month, locked_at, locked_by) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, transaction_id, account_id, debet, kredit, description, created_at) FROM stdin;
5	3	9	0.00	92.40		2025-12-22 21:38:43.060305
6	3	7	92.40	0.00		2025-12-22 21:38:43.060305
7	4	9	0.00	318.41		2025-12-22 21:38:59.234697
8	4	7	318.41	0.00		2025-12-22 21:38:59.234697
9	5	9	0.00	187.00		2025-12-22 21:39:22.24137
10	5	6	187.00	0.00		2025-12-22 21:39:22.24137
11	6	9	0.00	55.00		2025-12-22 22:06:19.31936
12	6	7	55.00	0.00		2025-12-22 22:06:19.31936
13	7	9	0.00	109.00		2025-12-22 22:10:53.007253
14	7	14	109.00	0.00		2025-12-22 22:10:53.007253
15	8	9	0.00	61.00		2025-12-22 22:12:49.348723
16	8	7	61.00	0.00		2025-12-22 22:12:49.348723
17	9	9	0.00	560.14		2025-12-22 22:12:53.225777
18	9	7	560.14	0.00		2025-12-22 22:12:53.225777
19	10	9	0.00	70.90		2025-12-22 22:12:57.457216
20	10	7	70.90	0.00		2025-12-22 22:12:57.457216
21	11	9	0.00	92.90		2025-12-22 22:13:02.112784
22	11	7	92.90	0.00		2025-12-22 22:13:02.112784
23	12	9	0.00	39.00		2025-12-22 22:14:01.19846
24	12	15	39.00	0.00		2025-12-22 22:14:01.19846
25	13	9	0.00	39.00		2025-12-22 22:14:05.767185
26	13	15	39.00	0.00		2025-12-22 22:14:05.767185
27	14	9	0.00	19.00		2025-12-22 22:14:45.970316
28	14	7	19.00	0.00		2025-12-22 22:14:45.970316
29	15	9	0.00	882.38		2025-12-22 22:14:50.744034
30	15	7	882.38	0.00		2025-12-22 22:14:50.744034
31	16	9	0.00	156.70		2025-12-22 22:14:55.627988
32	16	7	156.70	0.00		2025-12-22 22:14:55.627988
33	17	9	0.00	98.80		2025-12-22 22:15:01.202727
34	17	7	98.80	0.00		2025-12-22 22:15:01.202727
35	18	9	0.00	38.50		2025-12-22 22:15:06.600435
36	18	7	38.50	0.00		2025-12-22 22:15:06.600435
37	19	9	0.00	40.00		2025-12-22 22:16:10.424631
38	19	8	40.00	0.00		2025-12-22 22:16:10.424631
39	20	9	0.00	64.70		2025-12-22 22:16:27.483355
40	20	8	64.70	0.00		2025-12-22 22:16:27.483355
41	21	9	0.00	405.00		2025-12-22 22:18:15.787355
42	21	16	270.00	0.00		2025-12-22 22:18:15.787355
43	21	18	135.00	0.00	Jessica bjudpizza	2025-12-22 22:18:15.787355
44	22	9	0.00	64.07		2025-12-22 22:18:21.054522
45	22	7	64.07	0.00		2025-12-22 22:18:21.054522
46	23	9	0.00	234.50		2025-12-22 22:18:28.248944
47	23	7	234.50	0.00		2025-12-22 22:18:28.248944
48	24	9	0.00	99.00		2025-12-22 22:18:33.270417
49	24	7	99.00	0.00		2025-12-22 22:18:33.270417
50	25	9	0.00	676.55		2025-12-22 22:18:37.048681
51	25	7	676.55	0.00		2025-12-22 22:18:37.048681
52	26	9	0.00	189.00		2025-12-22 22:19:18.743206
53	26	14	189.00	0.00		2025-12-22 22:19:18.743206
58	29	9	0.00	43.00		2025-12-22 22:21:06.013671
59	29	15	43.00	0.00		2025-12-22 22:21:06.013671
60	30	9	0.00	43.00		2025-12-22 22:21:10.366022
61	30	15	43.00	0.00		2025-12-22 22:21:10.366022
62	31	9	0.00	600.61		2025-12-22 22:21:38.439401
63	31	1	600.61	0.00		2025-12-22 22:21:38.439401
64	32	9	0.00	72.00		2025-12-22 22:29:36.706406
65	32	22	72.00	0.00		2025-12-22 22:29:36.706406
70	35	9	0.00	38.95		2025-12-22 22:30:36.993578
71	35	7	38.95	0.00		2025-12-22 22:30:36.993578
72	36	9	0.00	125.00		2025-12-22 22:31:38.568467
73	36	18	125.00	0.00		2025-12-22 22:31:38.568467
74	37	9	0.00	44.70		2025-12-22 22:32:53.243675
75	37	7	44.70	0.00		2025-12-22 22:32:53.243675
76	38	9	0.00	50.00		2025-12-22 22:34:15.849528
77	38	24	50.00	0.00		2025-12-22 22:34:15.849528
78	39	9	0.00	1194.00		2025-12-22 22:35:02.503452
79	39	24	1194.00	0.00		2025-12-22 22:35:02.503452
80	40	9	0.00	1520.00		2025-12-22 22:37:08.694395
81	40	25	1520.00	0.00		2025-12-22 22:37:08.694395
82	41	9	0.00	409.70		2025-12-22 22:37:27.794648
83	41	7	409.70	0.00		2025-12-22 22:37:27.794648
84	42	9	0.00	457.10		2025-12-22 22:41:32.67451
85	42	24	457.10	0.00		2025-12-22 22:41:32.67451
86	43	9	0.00	550.00		2025-12-22 22:41:44.561385
87	43	24	550.00	0.00		2025-12-22 22:41:44.561385
88	44	9	0.00	428.00		2025-12-22 22:41:57.491751
89	44	23	428.00	0.00		2025-12-22 22:41:57.491751
92	45	9	0.00	642.00		2025-12-22 22:46:57.914454
93	45	2	642.00	0.00		2025-12-22 22:46:57.914454
94	46	9	0.00	3998.00		2025-12-22 22:49:41.990577
95	46	19	3998.00	0.00		2025-12-22 22:49:41.990577
98	47	9	0.00	160.00		2025-12-22 22:58:10.381748
99	47	26	160.00	0.00		2025-12-22 22:58:10.381748
100	48	9	0.00	160.00		2025-12-22 22:58:25.144097
101	48	26	160.00	0.00		2025-12-22 22:58:25.144097
102	49	9	0.00	300.00		2025-12-22 22:59:46.274105
103	49	17	300.00	0.00		2025-12-22 22:59:46.274105
104	50	9	0.00	235.00		2025-12-22 22:59:51.851727
105	50	26	235.00	0.00		2025-12-22 22:59:51.851727
108	52	9	0.00	114.60		2025-12-22 23:05:44.294698
109	52	7	114.60	0.00		2025-12-22 23:05:44.294698
110	53	9	32661.00	0.00		2025-12-22 23:05:52.648982
111	53	13	0.00	32661.00		2025-12-22 23:05:52.648982
112	54	9	26909.00	0.00		2025-12-22 23:06:00.040687
113	54	13	0.00	26909.00		2025-12-22 23:06:00.040687
114	55	9	0.00	10000.00		2025-12-22 23:11:15.978935
115	55	10	10000.00	0.00		2025-12-22 23:11:15.978935
118	57	9	0.00	7800.00		2025-12-22 23:13:55.249277
119	57	29	7000.00	0.00		2025-12-22 23:13:55.249277
120	57	31	800.00	0.00		2025-12-22 23:13:55.249277
121	58	9	0.00	298.90		2025-12-22 23:14:51.646732
122	58	8	298.90	0.00		2025-12-22 23:14:51.646732
127	60	9	0.00	1000.00		2025-12-22 23:16:03.921159
128	60	28	1000.00	0.00		2025-12-22 23:16:03.921159
129	56	9	0.00	1000.00		2025-12-22 23:16:09.462391
130	56	28	1000.00	0.00		2025-12-22 23:16:09.462391
131	61	9	0.00	430.44		2025-12-22 23:16:17.976434
132	61	7	430.44	0.00		2025-12-22 23:16:17.976434
133	62	9	0.00	500.00		2025-12-22 23:16:39.619285
134	62	17	500.00	0.00		2025-12-22 23:16:39.619285
135	63	9	0.00	102.95		2025-12-22 23:16:48.127301
136	63	7	102.95	0.00		2025-12-22 23:16:48.127301
137	64	9	0.00	120.00		2025-12-22 23:17:06.484162
138	64	32	120.00	0.00		2025-12-22 23:17:06.484162
139	65	9	0.00	721.92		2025-12-22 23:17:24.141324
140	65	7	721.92	0.00		2025-12-22 23:17:24.141324
141	66	9	0.00	407.05		2025-12-22 23:17:49.813265
142	66	6	407.05	0.00		2025-12-22 23:17:49.813265
143	67	9	0.00	39.00		2025-12-22 23:17:54.34672
144	67	15	39.00	0.00		2025-12-22 23:17:54.34672
145	68	9	0.00	39.00		2025-12-22 23:17:57.968343
146	68	15	39.00	0.00		2025-12-22 23:17:57.968343
147	69	9	0.00	79.00		2025-12-22 23:18:08.736657
148	69	32	79.00	0.00		2025-12-22 23:18:08.736657
149	70	9	0.00	99.00		2025-12-22 23:18:20.34773
150	70	32	99.00	0.00		2025-12-22 23:18:20.34773
151	71	9	0.00	99.00		2025-12-22 23:18:30.292523
152	71	32	99.00	0.00		2025-12-22 23:18:30.292523
153	72	9	0.00	45.00		2025-12-22 23:18:46.892784
154	72	32	45.00	0.00		2025-12-22 23:18:46.892784
155	73	9	0.00	260.00		2025-12-22 23:18:55.136628
156	73	32	260.00	0.00		2025-12-22 23:18:55.136628
157	74	9	0.00	5.00		2025-12-22 23:19:08.702191
158	74	17	5.00	0.00		2025-12-22 23:19:08.702191
159	75	9	0.00	658.80		2025-12-22 23:19:13.895481
160	75	7	658.80	0.00		2025-12-22 23:19:13.895481
161	76	9	0.00	195.00		2025-12-22 23:21:03.068027
162	76	32	195.00	0.00		2025-12-22 23:21:03.068027
163	77	9	0.00	109.00		2025-12-22 23:21:17.548033
164	77	14	109.00	0.00		2025-12-22 23:21:17.548033
165	78	9	0.00	359.54		2025-12-22 23:21:23.108169
166	78	7	359.54	0.00		2025-12-22 23:21:23.108169
167	79	9	0.00	760.72		2025-12-22 23:21:28.107619
168	79	7	760.72	0.00		2025-12-22 23:21:28.107619
169	80	9	0.00	2863.50		2025-12-22 23:23:41.468242
170	80	34	2863.50	0.00		2025-12-22 23:23:41.468242
178	81	9	0.00	5000.00		2025-12-22 23:28:15.830131
179	81	30	7000.00	0.00		2025-12-22 23:28:15.830131
180	81	34	0.00	2863.50		2025-12-22 23:28:15.830131
181	81	35	863.50	0.00		2025-12-22 23:28:15.830131
182	82	9	2500.00	0.00		2025-12-22 23:54:03.822902
183	82	10	0.00	2500.00		2025-12-22 23:54:03.822902
184	83	9	1000.00	0.00		2025-12-22 23:56:01.540572
185	83	33	0.00	1000.00		2025-12-22 23:56:01.540572
186	84	9	0.00	1800.00		2025-12-22 23:56:53.919567
187	84	34	1800.00	0.00		2025-12-22 23:56:53.919567
188	85	9	1231.29	0.00		2025-12-22 23:59:04.482369
189	85	37	0.00	1231.29		2025-12-22 23:59:04.482369
192	87	9	5000.00	0.00		2025-12-23 00:04:37.401208
193	87	10	0.00	5000.00		2025-12-23 00:04:37.401208
194	88	9	5000.00	0.00		2025-12-23 00:04:46.992728
195	88	10	0.00	5000.00		2025-12-23 00:04:46.992728
196	89	9	0.00	563.60		2025-12-23 00:07:49.682713
197	89	8	563.60	0.00		2025-12-23 00:07:49.682713
198	90	9	0.00	109.32		2025-12-23 00:07:59.967674
199	90	7	109.32	0.00		2025-12-23 00:07:59.967674
202	92	9	0.00	82.00		2025-12-23 00:08:26.427077
203	92	15	82.00	0.00		2025-12-23 00:08:26.427077
204	93	9	0.00	82.00		2025-12-23 00:08:31.223527
205	93	15	82.00	0.00		2025-12-23 00:08:31.223527
206	94	9	0.00	82.00		2025-12-23 00:08:35.777672
207	94	15	82.00	0.00		2025-12-23 00:08:35.777672
210	96	9	0.00	400.54		2025-12-23 00:08:47.787558
211	96	7	400.54	0.00		2025-12-23 00:08:47.787558
212	97	9	0.00	82.00		2025-12-23 00:08:54.967732
213	97	15	82.00	0.00		2025-12-23 00:08:54.967732
214	98	9	0.00	82.00		2025-12-23 00:08:59.125134
215	98	15	82.00	0.00		2025-12-23 00:08:59.125134
216	99	9	0.00	82.00		2025-12-23 00:09:03.085873
217	99	15	82.00	0.00		2025-12-23 00:09:03.085873
218	100	9	0.00	189.00		2025-12-23 00:09:14.795028
219	100	14	189.00	0.00		2025-12-23 00:09:14.795028
220	101	9	0.00	1056.75		2025-12-23 00:09:19.619396
221	101	7	1056.75	0.00		2025-12-23 00:09:19.619396
222	102	9	0.00	235.00		2025-12-23 00:09:27.273847
223	102	26	235.00	0.00		2025-12-23 00:09:27.273847
224	103	9	0.00	3998.00		2025-12-23 00:09:47.941256
225	103	19	3998.00	0.00		2025-12-23 00:09:47.941256
226	104	9	0.00	356.55		2025-12-23 00:09:57.500141
227	104	7	356.55	0.00		2025-12-23 00:09:57.500141
228	105	9	0.00	1520.00		2025-12-23 00:10:11.202998
229	105	25	1520.00	0.00		2025-12-23 00:10:11.202998
230	106	9	0.00	1455.00		2025-12-23 00:10:36.710543
231	106	20	1455.00	0.00		2025-12-23 00:10:36.710543
232	107	9	0.00	351.00		2025-12-23 00:10:54.005527
233	107	20	351.00	0.00		2025-12-23 00:10:54.005527
234	108	9	0.00	85.00		2025-12-23 00:11:00.021491
235	108	15	85.00	0.00		2025-12-23 00:11:00.021491
236	109	9	0.00	444.32		2025-12-23 00:11:10.873573
237	109	21	444.32	0.00		2025-12-23 00:11:10.873573
238	110	9	0.00	160.00		2025-12-23 00:11:23.213174
239	110	26	160.00	0.00		2025-12-23 00:11:23.213174
240	111	9	0.00	300.00		2025-12-23 00:11:34.806411
241	111	17	300.00	0.00		2025-12-23 00:11:34.806411
242	112	9	0.00	441.00		2025-12-23 00:11:44.709001
243	112	6	441.00	0.00		2025-12-23 00:11:44.709001
244	113	9	0.00	49.00		2025-12-23 00:11:50.059916
245	113	7	49.00	0.00		2025-12-23 00:11:50.059916
246	114	9	0.00	375.00		2025-12-23 00:12:03.381194
247	114	35	375.00	0.00		2025-12-23 00:12:03.381194
250	116	9	0.00	69.90		2025-12-23 00:12:16.604716
251	116	7	69.90	0.00		2025-12-23 00:12:16.604716
252	117	9	0.00	1270.00		2025-12-23 00:12:51.791801
253	117	28	1000.00	0.00		2025-12-23 00:12:51.791801
254	117	16	270.00	0.00		2025-12-23 00:12:51.791801
255	118	9	0.00	160.00		2025-12-23 00:13:04.882787
256	118	26	160.00	0.00		2025-12-23 00:13:04.882787
257	119	9	0.00	639.00		2025-12-23 00:13:15.137446
258	119	2	639.00	0.00		2025-12-23 00:13:15.137446
259	120	9	0.00	29.00		2025-12-23 00:13:20.438535
260	120	15	29.00	0.00		2025-12-23 00:13:20.438535
263	122	9	28044.00	0.00		2025-12-23 00:13:46.71118
264	122	13	0.00	28044.00		2025-12-23 00:13:46.71118
265	123	9	33369.00	0.00		2025-12-23 00:13:57.611093
266	123	13	0.00	33369.00		2025-12-23 00:13:57.611093
267	124	9	0.00	115.60		2025-12-23 00:14:02.775677
268	124	7	115.60	0.00		2025-12-23 00:14:02.775677
271	126	9	0.00	112.85		2025-12-23 00:14:15.225525
272	126	7	112.85	0.00		2025-12-23 00:14:15.225525
273	127	9	0.00	76.69		2025-12-23 00:14:20.518491
274	127	7	76.69	0.00		2025-12-23 00:14:20.518491
275	128	9	0.00	299.50		2025-12-23 00:14:25.29536
276	128	7	299.50	0.00		2025-12-23 00:14:25.29536
277	129	9	0.00	1154.91		2025-12-23 00:14:35.795232
278	129	1	1154.91	0.00		2025-12-23 00:14:35.795232
279	130	9	0.00	458.00		2025-12-23 00:14:45.894766
280	130	6	458.00	0.00		2025-12-23 00:14:45.894766
281	131	9	0.00	1000.00		2025-12-23 00:14:59.761547
282	131	28	1000.00	0.00		2025-12-23 00:14:59.761547
283	132	9	0.00	185.57		2025-12-23 00:15:04.718353
284	132	7	185.57	0.00		2025-12-23 00:15:04.718353
285	133	9	0.00	7000.00		2025-12-23 00:15:17.766756
286	133	29	7000.00	0.00		2025-12-23 00:15:17.766756
287	134	9	0.00	7000.00		2025-12-23 00:15:34.714808
288	134	30	7000.00	0.00		2025-12-23 00:15:34.714808
289	135	9	0.00	358.49		2025-12-23 00:15:46.095812
290	135	7	358.49	0.00		2025-12-23 00:15:46.095812
291	136	9	0.00	1276.45		2025-12-23 00:15:51.011902
292	136	7	1276.45	0.00		2025-12-23 00:15:51.011902
293	137	9	0.00	134.95		2025-12-23 00:15:55.764988
294	137	7	134.95	0.00		2025-12-23 00:15:55.764988
295	138	9	0.00	233.83		2025-12-23 00:16:01.796728
296	138	7	233.83	0.00		2025-12-23 00:16:01.796728
297	139	9	0.00	437.80		2025-12-23 00:16:17.987033
298	139	24	437.80	0.00		2025-12-23 00:16:17.987033
299	140	9	0.00	846.16		2025-12-23 00:16:27.299573
300	140	35	846.16	0.00		2025-12-23 00:16:27.299573
301	141	9	0.00	247.55		2025-12-23 00:16:31.985113
302	141	7	247.55	0.00		2025-12-23 00:16:31.985113
303	142	9	0.00	1000.00		2025-12-23 00:16:43.473724
304	142	35	1000.00	0.00		2025-12-23 00:16:43.473724
305	143	9	0.00	160.90		2025-12-23 00:16:47.385629
306	143	7	160.90	0.00		2025-12-23 00:16:47.385629
307	144	9	0.00	229.00		2025-12-23 00:16:55.973534
308	144	6	229.00	0.00		2025-12-23 00:16:55.973534
309	145	9	0.00	303.07		2025-12-23 00:17:00.455296
310	145	7	303.07	0.00		2025-12-23 00:17:00.455296
311	146	9	0.00	98.00		2025-12-23 00:17:19.574689
312	146	32	98.00	0.00		2025-12-23 00:17:19.574689
313	147	9	0.00	159.00		2025-12-23 00:18:37.165482
314	147	14	159.00	0.00		2025-12-23 00:18:37.165482
315	148	9	0.00	556.84		2025-12-23 00:18:50.278765
316	148	21	556.84	0.00		2025-12-23 00:18:50.278765
317	149	9	0.00	810.00		2025-12-23 09:22:27.489756
318	149	32	810.00	0.00		2025-12-23 09:22:27.489756
319	150	9	0.00	305.00		2025-12-23 09:23:14.845271
320	150	16	305.00	0.00		2025-12-23 09:23:14.845271
321	151	9	0.00	351.00		2025-12-23 09:23:28.7529
322	151	16	351.00	0.00		2025-12-23 09:23:28.7529
323	152	9	0.00	11.25		2025-12-23 09:28:44.838006
324	152	14	11.25	0.00		2025-12-23 09:28:44.838006
325	153	9	0.00	195.00		2025-12-23 09:34:52.103512
326	153	32	195.00	0.00		2025-12-23 09:34:52.103512
327	154	9	0.00	11.25		2025-12-23 09:36:22.037815
328	154	14	11.25	0.00		2025-12-23 09:36:22.037815
329	155	9	0.00	115.00		2025-12-23 09:36:37.537696
330	155	16	115.00	0.00		2025-12-23 09:36:37.537696
331	156	9	0.00	159.00		2025-12-23 09:36:47.30952
332	156	16	159.00	0.00		2025-12-23 09:36:47.30952
333	157	9	0.00	84.00		2025-12-23 09:36:55.508294
334	157	16	84.00	0.00		2025-12-23 09:36:55.508294
335	158	9	0.00	264.00		2025-12-23 09:37:06.810411
336	158	16	264.00	0.00		2025-12-23 09:37:06.810411
337	159	9	0.00	290.00		2025-12-23 09:37:14.865576
338	159	16	290.00	0.00		2025-12-23 09:37:14.865576
339	160	9	0.00	191.00		2025-12-23 09:37:23.142902
340	160	16	191.00	0.00		2025-12-23 09:37:23.142902
341	161	9	0.00	209.40		2025-12-23 09:37:27.779083
342	161	7	209.40	0.00		2025-12-23 09:37:27.779083
343	162	9	0.00	261.00		2025-12-23 09:37:39.857984
344	162	16	261.00	0.00		2025-12-23 09:37:39.857984
345	163	9	4943.20	0.00		2025-12-23 09:37:54.602237
346	163	37	0.00	4943.20		2025-12-23 09:37:54.602237
347	164	9	0.00	357.72		2025-12-23 09:37:59.292484
348	164	7	357.72	0.00		2025-12-23 09:37:59.292484
349	165	9	0.00	30000.00		2025-12-23 09:38:31.308183
350	165	27	30000.00	0.00		2025-12-23 09:38:31.308183
351	166	9	0.00	207.83		2025-12-23 09:38:37.209498
352	166	7	207.83	0.00		2025-12-23 09:38:37.209498
353	167	9	0.00	40.00		2025-12-23 09:38:48.889714
354	167	16	40.00	0.00		2025-12-23 09:38:48.889714
355	168	9	0.00	82.00		2025-12-23 09:38:57.947191
356	168	16	82.00	0.00		2025-12-23 09:38:57.947191
357	169	9	0.00	203.30		2025-12-23 09:39:04.014636
358	169	6	203.30	0.00		2025-12-23 09:39:04.014636
359	170	9	0.00	29.00		2025-12-23 09:39:08.80179
360	170	15	29.00	0.00		2025-12-23 09:39:08.80179
361	171	9	0.00	40.00		2025-12-23 09:39:20.735198
362	171	16	40.00	0.00		2025-12-23 09:39:20.735198
363	172	9	0.00	146.00		2025-12-23 09:39:30.818672
364	172	16	146.00	0.00		2025-12-23 09:39:30.818672
365	173	9	0.00	3443.20		2025-12-23 09:39:41.805165
366	173	37	3443.20	0.00		2025-12-23 09:39:41.805165
367	174	9	0.00	192.00		2025-12-23 09:39:55.217704
368	174	16	192.00	0.00		2025-12-23 09:39:55.217704
369	175	9	0.00	34.00		2025-12-23 09:40:14.070259
370	175	16	34.00	0.00		2025-12-23 09:40:14.070259
371	176	9	0.00	45.00		2025-12-23 09:40:23.954506
372	176	16	45.00	0.00		2025-12-23 09:40:23.954506
373	177	9	0.00	212.00		2025-12-23 09:40:33.13291
374	177	16	212.00	0.00		2025-12-23 09:40:33.13291
375	178	9	0.00	144.00		2025-12-23 09:40:50.102251
376	178	16	144.00	0.00		2025-12-23 09:40:50.102251
377	179	9	0.00	240.00		2025-12-23 09:41:05.822004
378	179	16	240.00	0.00		2025-12-23 09:41:05.822004
379	180	9	0.00	96.00		2025-12-23 09:41:36.273908
380	180	16	96.00	0.00		2025-12-23 09:41:36.273908
381	115	9	0.00	11.00		2025-12-23 15:57:07.563715
382	115	40	11.00	0.00		2025-12-23 15:57:07.563715
383	181	9	0.00	22.25		2025-12-23 16:07:42.101132
384	181	40	22.25	0.00		2025-12-23 16:07:42.101132
387	183	9	0.00	35.00		2025-12-23 23:14:09.244151
388	183	14	35.00	0.00		2025-12-23 23:14:09.244151
389	184	9	0.00	35.00		2025-12-23 23:14:22.380082
390	184	14	35.00	0.00		2025-12-23 23:14:22.380082
391	185	9	250.00	0.00		2025-12-23 23:18:25.651629
392	185	7	0.00	250.00		2025-12-23 23:18:25.651629
393	186	9	0.00	700.00		2025-12-23 23:20:44.042098
394	186	37	700.00	0.00		2025-12-23 23:20:44.042098
395	187	9	0.00	70.00		2025-12-23 23:21:03.55527
396	187	37	70.00	0.00		2025-12-23 23:21:03.55527
397	188	9	0.00	461.29		2025-12-23 23:21:13.753291
398	188	37	461.29	0.00		2025-12-23 23:21:13.753291
399	189	9	0.00	323.75		2025-12-23 23:22:03.416233
400	189	33	323.75	0.00		2025-12-23 23:22:03.416233
401	190	9	323.00	0.00		2025-12-23 23:22:29.836296
402	190	33	0.00	323.75		2025-12-23 23:22:29.836296
403	190	35	0.75	0.00		2025-12-23 23:22:29.836296
404	191	9	0.00	500.00		2025-12-23 23:23:32.015025
405	191	8	500.00	0.00		2025-12-23 23:23:32.015025
406	192	9	500.00	0.00		2025-12-23 23:23:52.163963
407	192	8	0.00	500.00		2025-12-23 23:23:52.163963
408	193	9	0.00	323.00		2025-12-23 23:24:55.376098
409	193	14	323.00	0.00		2025-12-23 23:24:55.376098
410	194	9	250.00	0.00		2025-12-23 23:26:23.51644
411	194	41	0.00	250.00		2025-12-23 23:26:23.51644
412	195	9	0.00	550.00		2025-12-23 23:26:34.70602
413	195	41	550.00	0.00		2025-12-23 23:26:34.70602
414	196	9	450.00	0.00		2025-12-23 23:27:20.679058
415	196	35	0.00	450.00		2025-12-23 23:27:20.679058
416	197	9	0.00	450.00		2025-12-23 23:27:33.06668
417	197	35	450.00	0.00		2025-12-23 23:27:33.06668
418	198	9	0.00	450.00		2025-12-23 23:27:41.924581
419	198	35	450.00	0.00		2025-12-23 23:27:41.924581
420	199	9	0.00	176.59		2025-12-23 23:27:56.568913
421	199	35	176.59	0.00		2025-12-23 23:27:56.568913
422	200	9	0.00	139.00		2025-12-23 23:29:00.56525
423	200	16	139.00	0.00		2025-12-23 23:29:00.56525
424	201	9	0.00	24.90		2025-12-23 23:29:10.350783
425	201	8	24.90	0.00		2025-12-23 23:29:10.350783
426	202	9	0.00	59.90		2025-12-23 23:29:31.998216
427	202	8	59.90	0.00		2025-12-23 23:29:31.998216
428	203	9	0.00	1199.70		2025-12-23 23:29:42.013225
429	203	35	1199.70	0.00		2025-12-23 23:29:42.013225
430	204	9	0.00	349.00		2025-12-23 23:29:53.136152
431	204	35	349.00	0.00		2025-12-23 23:29:53.136152
432	205	9	220.00	0.00		2025-12-23 23:30:23.629317
433	205	15	0.00	220.00		2025-12-23 23:30:23.629317
434	206	9	0.00	86.00		2025-12-23 23:30:39.525194
435	206	7	86.00	0.00		2025-12-23 23:30:39.525194
436	207	9	0.00	70.00		2025-12-23 23:30:51.753358
437	207	8	70.00	0.00		2025-12-23 23:30:51.753358
438	208	9	0.00	662.00		2025-12-23 23:33:00.430182
439	208	6	662.00	0.00		2025-12-23 23:33:00.430182
440	209	9	0.00	736.00		2025-12-23 23:33:09.336981
441	209	6	736.00	0.00		2025-12-23 23:33:09.336981
442	210	9	0.00	1250.98		2025-12-23 23:33:14.581352
443	210	7	1250.98	0.00		2025-12-23 23:33:14.581352
444	211	9	0.00	105.95		2025-12-23 23:33:21.276078
445	211	7	105.95	0.00		2025-12-23 23:33:21.276078
446	212	9	0.00	2500.00		2025-12-23 23:33:34.62406
447	212	10	2500.00	0.00		2025-12-23 23:33:34.62406
448	213	9	15000.00	0.00		2025-12-23 23:35:25.664162
449	213	13	0.00	15000.00		2025-12-23 23:35:25.664162
450	214	9	0.00	1855.00		2025-12-23 23:36:42.979985
451	214	32	1855.00	0.00		2025-12-23 23:36:42.979985
452	215	9	0.00	300.00		2025-12-23 23:38:29.362457
453	215	15	300.00	0.00		2025-12-23 23:38:29.362457
454	216	9	0.00	300.00		2025-12-23 23:39:22.296046
455	216	35	300.00	0.00		2025-12-23 23:39:22.296046
458	217	37	1500.00	0.00		2025-12-23 23:45:37.457825
459	217	42	0.00	1500.00		2025-12-23 23:45:37.457825
460	218	12	27330.00	0.00		2025-12-23 23:47:28.576579
461	218	43	0.00	27330.00		2025-12-23 23:47:28.576579
462	219	9	0.00	769.60		2025-12-23 23:49:03.234119
463	219	35	769.60	0.00		2025-12-23 23:49:03.234119
464	220	9	0.00	738.00		2025-12-23 23:51:54.470737
465	220	35	738.00	0.00		2025-12-23 23:51:54.470737
466	221	10	75000.00	0.00		2025-12-24 00:00:58.02371
467	221	43	0.00	75000.00		2025-12-24 00:00:58.02371
470	125	9	89.70	0.00		2025-12-24 00:04:56.170157
471	125	7	0.00	89.70		2025-12-24 00:04:56.170157
472	223	9	0.00	340.00		2025-12-26 21:12:53.308165
473	223	15	340.00	0.00		2025-12-26 21:12:53.308165
474	224	9	0.00	175.70		2025-12-26 21:14:24.639377
475	224	7	175.70	0.00		2025-12-26 21:14:24.639377
476	225	9	0.00	334.00		2025-12-26 21:14:36.162728
477	225	16	334.00	0.00		2025-12-26 21:14:36.162728
478	226	9	0.00	1123.40		2025-12-26 21:14:49.154387
479	226	1	1123.40	0.00		2025-12-26 21:14:49.154387
480	227	9	0.00	372.57		2025-12-26 21:14:54.31916
481	227	7	372.57	0.00		2025-12-26 21:14:54.31916
482	228	9	0.00	133.80		2025-12-26 21:14:59.772547
483	228	7	133.80	0.00		2025-12-26 21:14:59.772547
486	51	9	0.00	16000.00		2025-12-29 14:01:09.243759
487	51	27	16000.00	0.00		2025-12-29 14:01:09.243759
488	229	27	0.00	749000.00		2025-12-29 14:01:51.691351
489	229	43	749000.00	0.00		2025-12-29 14:01:51.691351
490	230	34	0.00	1464.00		2025-12-29 14:30:22.637359
491	230	15	1464.00	0.00		2025-12-29 14:30:22.637359
492	231	17	200.00	0.00		2025-12-29 14:30:48.759707
493	231	34	0.00	200.00		2025-12-29 14:30:48.759707
494	232	26	235.00	0.00		2025-12-29 14:31:13.426715
495	232	34	0.00	235.00		2025-12-29 14:31:13.426715
496	233	16	135.00	0.00		2025-12-29 14:31:32.092549
497	233	34	0.00	135.00		2025-12-29 14:31:32.092549
500	235	34	3850.00	0.00		2025-12-29 14:33:01.268209
501	235	13	0.00	3850.00		2025-12-29 14:33:01.268209
502	236	34	200.00	0.00		2025-12-29 14:33:25.010038
503	236	15	0.00	200.00		2025-12-29 14:33:25.010038
504	237	44	0.00	800.00		2025-12-29 14:35:01.013252
505	237	34	800.00	0.00		2025-12-29 14:35:01.013252
506	238	9	0.00	1000.00		2025-12-29 14:58:13.500555
507	238	28	1000.00	0.00		2025-12-29 14:58:13.500555
508	239	9	0.00	300.00		2025-12-29 14:58:24.011217
509	239	17	300.00	0.00		2025-12-29 14:58:24.011217
512	241	9	0.00	160.00		2025-12-29 14:58:51.026724
513	241	26	160.00	0.00		2025-12-29 14:58:51.026724
514	242	9	0.00	160.00		2025-12-29 14:58:57.358904
515	242	26	160.00	0.00		2025-12-29 14:58:57.358904
516	243	9	0.00	428.00		2025-12-29 14:59:20.537356
517	243	23	428.00	0.00		2025-12-29 14:59:20.537356
518	244	9	0.00	348.75		2025-12-29 14:59:44.189834
519	244	35	348.75	0.00		2025-12-29 14:59:44.189834
522	246	9	14000.00	0.00		2025-12-29 15:00:38.740784
523	246	35	0.00	14000.00		2025-12-29 15:00:38.740784
524	245	9	0.00	14000.00		2025-12-29 15:04:39.007664
525	245	35	14000.00	0.00		2025-12-29 15:04:39.007664
526	247	9	0.00	14000.00		2025-12-29 15:16:53.168196
527	247	37	14000.00	0.00		2025-12-29 15:16:53.168196
528	248	9	0.00	1000.00		2025-12-29 15:17:01.161028
529	248	28	1000.00	0.00		2025-12-29 15:17:01.161028
530	249	9	0.00	35.00		2025-12-29 15:17:08.175466
531	249	14	35.00	0.00		2025-12-29 15:17:08.175466
532	250	9	0.00	35.00		2025-12-29 15:17:12.582939
533	250	14	35.00	0.00		2025-12-29 15:17:12.582939
534	251	9	0.00	438.63		2025-12-29 15:17:17.539188
535	251	7	438.63	0.00		2025-12-29 15:17:17.539188
536	252	9	19277.00	0.00		2025-12-29 15:17:39.940954
537	252	37	0.00	19277.00		2025-12-29 15:17:39.940954
538	253	9	0.00	19346.00		2025-12-29 15:17:52.251565
539	253	37	19346.00	0.00		2025-12-29 15:17:52.251565
540	254	9	0.00	1000.00		2025-12-29 15:18:12.808006
541	254	33	1000.00	0.00		2025-12-29 15:18:12.808006
546	255	37	0.00	14069.00		2025-12-29 15:20:35.432878
547	255	30	7000.00	0.00		2025-12-29 15:20:35.432878
548	255	29	7000.00	0.00		2025-12-29 15:20:35.432878
549	255	34	69.00	0.00		2025-12-29 15:20:35.432878
558	260	9	0.00	11.25		2026-01-01 14:17:11.929811
559	260	14	11.25	0.00		2026-01-01 14:17:11.929811
562	262	9	0.00	1263.02		2026-01-01 14:21:24.104798
563	262	7	1263.02	0.00		2026-01-01 14:21:24.104798
564	263	9	0.00	4074.00		2026-01-01 14:43:01.230126
565	263	19	4074.00	0.00		2026-01-01 14:43:01.230126
566	264	9	0.00	19000.00		2026-01-01 14:50:49.981417
567	264	27	19000.00	0.00		2026-01-01 14:50:49.981417
580	269	9	0.00	1513.00		2026-01-01 17:34:38.499514
581	269	25	1513.00	0.00		2026-01-01 17:34:38.499514
582	270	9	0.00	639.00		2026-01-01 17:34:51.783123
583	270	2	639.00	0.00		2026-01-01 17:34:51.783123
584	271	9	0.00	257.00		2026-01-01 17:34:58.993844
585	271	7	257.00	0.00		2026-01-01 17:34:58.993844
586	272	9	0.00	235.00		2026-01-01 17:35:06.862644
587	272	26	235.00	0.00		2026-01-01 17:35:06.862644
588	273	12	127.05	0.00		2026-01-01 17:47:48.804902
589	273	42	0.00	127.05		2026-01-01 17:47:48.804902
592	275	11	3057.69	0.00		2026-01-01 17:49:42.497729
593	275	42	0.00	3057.69		2026-01-01 17:49:42.497729
594	274	10	431.90	0.00		2026-01-01 17:49:56.459537
595	274	42	0.00	431.90		2026-01-01 17:49:56.459537
596	276	12	61.37	0.00		2026-01-01 18:02:06.859687
597	276	42	0.00	61.37		2026-01-01 18:02:06.859687
600	222	11	461366.76	0.00		2026-01-01 18:54:13.429028
601	222	43	0.00	461366.76		2026-01-01 18:54:13.429028
626	277	10	0.00	431.90		2026-01-01 20:43:15.96674
627	277	12	431.90	0.00		2026-01-01 20:43:15.96674
628	182	9	0.00	239.00		2026-01-01 21:05:46.3789
629	182	7	239.00	0.00		2026-01-01 21:05:46.3789
630	286	28	2000.00	0.00		2026-01-01 22:36:32.026595
631	286	43	0.00	2000.00		2026-01-01 22:36:32.026595
632	261	9	5.42	0.00		2026-01-01 23:55:30.408418
633	261	42	0.00	5.42		2026-01-01 23:55:30.408418
636	34	9	0.00	1455.00		2026-01-01 23:57:18.329313
637	34	45	1455.00	0.00		2026-01-01 23:57:18.329313
638	287	45	0.00	1455.00		2026-01-01 23:59:21.498175
639	287	20	1455.00	0.00		2026-01-01 23:59:21.498175
640	288	45	0.00	282.00		2026-01-01 23:59:50.578472
641	288	20	282.00	0.00		2026-01-01 23:59:50.578472
642	33	9	0.00	282.00		2026-01-02 00:03:00.491118
643	33	45	282.00	0.00		2026-01-02 00:03:00.491118
646	283	9	0.00	1370.00		2026-01-02 00:06:44.290085
647	283	20	1370.00	0.00		2026-01-02 00:06:44.290085
648	278	9	0.00	237.00		2026-01-02 00:06:51.45785
649	278	20	237.00	0.00		2026-01-02 00:06:51.45785
660	95	9	0.00	151.00		2026-01-02 14:29:13.353442
661	95	38	151.00	0.00		2026-01-02 14:29:13.353442
662	27	9	0.00	151.00		2026-01-02 14:29:19.850469
663	27	38	151.00	0.00		2026-01-02 14:29:19.850469
666	86	9	0.00	704.00		2026-01-02 14:30:21.574346
667	86	38	704.00	0.00		2026-01-02 14:30:21.574346
668	240	9	0.00	297.00		2026-01-02 14:30:39.43325
669	240	5	297.00	0.00		2026-01-02 14:30:39.43325
670	59	9	0.00	259.00		2026-01-02 14:30:44.125187
671	59	5	259.00	0.00		2026-01-02 14:30:44.125187
672	121	9	0.00	259.00		2026-01-02 14:30:47.886165
673	121	5	259.00	0.00		2026-01-02 14:30:47.886165
674	28	9	0.00	141.00		2026-01-02 14:30:56.437937
675	28	47	141.00	0.00		2026-01-02 14:30:56.437937
676	91	9	0.00	141.00		2026-01-02 14:31:00.857428
677	91	47	141.00	0.00		2026-01-02 14:31:00.857428
681	289	9	0.00	189.00		2026-01-07 00:44:50.907067
682	289	14	189.00	0.00		2026-01-07 00:44:50.907067
683	290	9	0.00	151.00		2026-01-07 00:45:18.436364
684	290	38	151.00	0.00		2026-01-07 00:45:18.436364
685	291	9	0.00	141.00		2026-01-07 00:45:33.662366
686	291	47	141.00	0.00		2026-01-07 00:45:33.662366
687	292	9	0.00	72.00		2026-01-07 00:45:57.211499
688	292	38	72.00	0.00		2026-01-07 00:45:57.211499
691	294	9	0.00	243.60		2026-01-07 00:46:25.025522
692	294	7	243.60	0.00		2026-01-07 00:46:25.025522
693	295	9	0.00	137.49		2026-01-07 00:46:35.214784
694	295	7	137.49	0.00		2026-01-07 00:46:35.214784
695	296	9	0.00	268.00		2026-01-07 00:46:46.232134
696	296	16	268.00	0.00		2026-01-07 00:46:46.232134
697	1	9	33181.00	0.00		2026-01-11 11:23:55.37313
698	1	13	0.00	33181.00		2026-01-11 11:23:55.37313
699	2	9	26475.00	0.00		2026-01-11 11:24:01.516335
700	2	13	0.00	26475.00		2026-01-11 11:24:01.516335
703	298	37	1.18	0.00		2026-01-11 12:09:45.038902
704	298	42	0.00	1.18		2026-01-11 12:09:45.038902
707	300	9	0.00	109.40		2026-01-11 12:11:54.899404
708	300	7	109.40	0.00		2026-01-11 12:11:54.899404
709	301	9	0.00	746.16		2026-01-11 12:11:58.26488
710	301	7	746.16	0.00		2026-01-11 12:11:58.26488
715	304	9	0.00	800.00		2026-01-11 12:33:24.265401
716	304	49	800.00	0.00		2026-01-11 12:33:24.265401
722	234	36	4685.00	0.00		2026-01-19 22:33:24.28964
723	234	34	0.00	4685.00		2026-01-19 22:33:24.28964
724	306	9	0.00	289.95		2026-01-19 22:35:22.405514
725	306	7	289.95	0.00		2026-01-19 22:35:22.405514
726	307	9	0.00	138.90		2026-01-19 22:35:28.72553
727	307	7	138.90	0.00		2026-01-19 22:35:28.72553
728	308	9	0.00	410.26		2026-01-19 22:35:34.715981
729	308	7	410.26	0.00		2026-01-19 22:35:34.715981
730	309	9	0.00	458.30		2026-01-19 22:36:56.312912
731	309	7	258.30	0.00		2026-01-19 22:36:56.312912
732	309	18	200.00	0.00		2026-01-19 22:36:56.312912
733	310	9	0.00	199.00		2026-01-19 22:37:17.566338
734	310	18	199.00	0.00		2026-01-19 22:37:17.566338
735	311	9	0.00	75.00		2026-01-19 22:37:24.00353
736	311	7	75.00	0.00		2026-01-19 22:37:24.00353
737	312	9	0.00	216.00		2026-01-19 22:38:03.201719
738	312	6	216.00	0.00		2026-01-19 22:38:03.201719
739	313	9	0.00	404.23		2026-01-19 22:38:08.345209
740	313	7	404.23	0.00		2026-01-19 22:38:08.345209
741	314	9	0.00	61.09		2026-01-19 22:38:14.729096
742	314	16	61.09	0.00		2026-01-19 22:38:14.729096
743	315	9	0.00	259.80		2026-01-19 22:38:18.22158
744	315	7	259.80	0.00		2026-01-19 22:38:18.22158
745	316	9	0.00	161.66		2026-01-19 22:38:22.368083
746	316	7	161.66	0.00		2026-01-19 22:38:22.368083
747	317	9	0.00	42.95		2026-01-19 22:38:31.175531
748	317	16	42.95	0.00		2026-01-19 22:38:31.175531
749	318	9	0.00	109.00		2026-01-19 22:38:36.600143
750	318	14	109.00	0.00		2026-01-19 22:38:36.600143
751	319	9	0.00	24.00		2026-01-19 22:38:43.581792
752	319	16	24.00	0.00		2026-01-19 22:38:43.581792
753	320	9	0.00	599.95		2026-01-19 22:38:49.358513
754	320	7	599.95	0.00		2026-01-19 22:38:49.358513
755	321	9	1000.00	0.00		2026-01-19 22:39:03.037805
756	321	10	0.00	1000.00		2026-01-19 22:39:03.037805
757	322	9	1000.00	0.00		2026-01-19 22:39:07.879729
758	322	10	0.00	1000.00		2026-01-19 22:39:07.879729
759	323	9	1000.00	0.00		2026-01-19 22:39:14.631112
760	323	10	0.00	1000.00		2026-01-19 22:39:14.631112
761	324	9	500.00	0.00		2026-01-19 22:40:20.626254
762	324	33	0.00	500.00		2026-01-19 22:40:20.626254
763	325	9	0.00	45.00		2026-01-19 22:44:05.130508
764	325	16	45.00	0.00		2026-01-19 22:44:05.130508
765	326	9	0.00	677.00		2026-01-19 22:45:14.666271
766	326	24	677.00	0.00		2026-01-19 22:45:14.666271
767	327	15	200.00	0.00		2026-01-19 22:46:25.267087
768	327	33	0.00	200.00		2026-01-19 22:46:25.267087
769	328	9	26808.00	0.00		2026-01-23 09:45:09.11066
770	328	13	0.00	26808.00		2026-01-23 09:45:09.11066
771	329	9	32304.00	0.00		2026-01-23 09:45:16.86171
772	329	13	0.00	32304.00		2026-01-23 09:45:16.86171
773	330	9	0.00	180.63		2026-01-23 09:45:23.595589
774	330	40	180.63	0.00		2026-01-23 09:45:23.595589
775	331	9	1500.00	0.00		2026-01-23 09:45:31.409602
776	331	10	0.00	1500.00		2026-01-23 09:45:31.409602
777	332	9	0.00	1119.27		2026-01-23 09:45:36.433065
778	332	7	1119.27	0.00		2026-01-23 09:45:36.433065
779	333	9	0.00	58.86		2026-01-23 09:45:41.119356
780	333	16	58.86	0.00		2026-01-23 09:45:41.119356
781	334	9	0.00	45.00		2026-01-23 09:45:47.007797
782	334	7	45.00	0.00		2026-01-23 09:45:47.007797
783	335	46	2873.00	0.00		2026-01-23 10:19:16.154316
784	335	50	0.00	2873.00		2026-01-23 10:19:16.154316
789	336	46	288.00	0.00		2026-01-23 10:23:17.976329
790	336	50	0.00	288.00		2026-01-23 10:23:17.976329
791	337	1	1142.00	0.00		2026-01-26 08:37:20.810803
792	337	15	218.00	0.00		2026-01-26 08:37:20.810803
793	337	15	226.00	0.00		2026-01-26 08:37:20.810803
794	337	33	139.00	0.00	chop chop, egna pengar	2026-01-26 08:37:20.810803
795	337	18	250.00	0.00	max till petsson och findus	2026-01-26 08:37:20.810803
796	337	33	125.00	0.00	max, egna pengar	2026-01-26 08:37:20.810803
797	337	34	0.00	2100.00		2026-01-26 08:37:20.810803
798	338	33	0.00	600.00		2026-01-26 08:38:26.918512
799	338	34	600.00	0.00		2026-01-26 08:38:26.918512
800	339	9	0.00	4500.00		2026-01-26 08:45:24.739459
801	339	10	4500.00	0.00		2026-01-26 08:45:24.739459
802	340	9	0.00	223.47		2026-01-26 08:45:34.45417
803	340	7	223.47	0.00		2026-01-26 08:45:34.45417
804	341	9	0.00	226.00		2026-01-26 08:45:41.843413
805	341	15	226.00	0.00		2026-01-26 08:45:41.843413
806	342	9	0.00	133.00		2026-01-26 08:45:48.914867
807	342	16	133.00	0.00		2026-01-26 08:45:48.914867
808	343	9	0.00	8000.00		2026-01-26 08:46:09.35523
809	343	30	4000.00	0.00		2026-01-26 08:46:09.35523
810	343	29	4000.00	0.00		2026-01-26 08:46:09.35523
811	344	9	0.00	35.00		2026-01-26 08:46:14.583639
812	344	14	35.00	0.00		2026-01-26 08:46:14.583639
813	345	9	0.00	35.00		2026-01-26 08:46:18.296365
814	345	14	35.00	0.00		2026-01-26 08:46:18.296365
815	346	9	0.00	226.00		2026-01-26 08:46:22.426195
816	346	15	226.00	0.00		2026-01-26 08:46:22.426195
817	347	9	0.00	1000.00		2026-01-26 08:46:31.207527
818	347	28	1000.00	0.00		2026-01-26 08:46:31.207527
819	348	9	0.00	1000.00		2026-01-26 08:46:40.932945
820	348	28	1000.00	0.00		2026-01-26 08:46:40.932945
821	349	9	0.00	2536.00		2026-01-26 08:47:00.195809
822	349	34	1500.00	0.00		2026-01-26 08:47:00.195809
823	349	33	1036.00	0.00		2026-01-26 08:47:00.195809
824	350	9	0.00	3161.00		2026-01-26 08:47:56.076311
825	350	49	3161.00	0.00		2026-01-26 08:47:56.076311
826	351	9	0.00	388.70		2026-02-04 16:07:23.525275
827	351	7	388.70	0.00		2026-02-04 16:07:23.525275
828	352	9	0.00	141.00		2026-02-04 16:07:35.53599
829	352	47	141.00	0.00		2026-02-04 16:07:35.53599
832	353	9	0.00	151.00		2026-02-04 16:09:15.911547
833	353	38	151.00	0.00		2026-02-04 16:09:15.911547
834	354	9	0.00	72.00		2026-02-04 16:09:31.667158
835	354	22	72.00	0.00		2026-02-04 16:09:31.667158
836	355	9	0.00	62.45		2026-02-04 16:09:36.742972
837	355	7	62.45	0.00		2026-02-04 16:09:36.742972
838	356	9	0.00	189.00		2026-02-04 16:09:42.322069
839	356	14	189.00	0.00		2026-02-04 16:09:42.322069
840	357	9	0.00	400.20		2026-02-04 16:09:46.618527
841	357	7	400.20	0.00		2026-02-04 16:09:46.618527
842	358	9	0.00	12.49		2026-02-04 16:09:51.477542
843	358	14	12.49	0.00		2026-02-04 16:09:51.477542
844	359	9	0.00	191.00		2026-02-04 16:10:00.928378
845	359	20	191.00	0.00		2026-02-04 16:10:00.928378
846	360	9	0.00	11.00		2026-02-04 16:10:07.465302
847	360	40	11.00	0.00		2026-02-04 16:10:07.465302
848	361	9	0.00	1696.00		2026-02-04 16:10:23.759029
849	361	25	1696.00	0.00		2026-02-04 16:10:23.759029
850	362	9	0.00	487.80		2026-02-04 16:10:28.653075
851	362	7	487.80	0.00		2026-02-04 16:10:28.653075
852	363	9	0.00	4074.00		2026-02-04 16:10:41.457317
853	363	19	4074.00	0.00		2026-02-04 16:10:41.457317
854	364	9	0.00	516.18		2026-02-04 16:10:45.554354
855	364	7	516.18	0.00		2026-02-04 16:10:45.554354
856	365	9	0.00	154.40		2026-02-04 16:10:52.030318
857	365	7	154.40	0.00		2026-02-04 16:10:52.030318
858	366	9	0.00	100.00		2026-02-04 16:10:59.16579
859	366	17	100.00	0.00		2026-02-04 16:10:59.16579
860	367	9	0.00	160.00		2026-02-04 16:11:07.420275
861	367	26	160.00	0.00		2026-02-04 16:11:07.420275
862	368	9	0.00	235.00		2026-02-04 16:11:12.349736
863	368	26	235.00	0.00		2026-02-04 16:11:12.349736
864	369	9	0.00	470.00		2026-02-04 16:11:18.060212
865	369	26	470.00	0.00		2026-02-04 16:11:18.060212
866	370	9	0.00	160.00		2026-02-04 16:11:22.062696
867	370	26	160.00	0.00		2026-02-04 16:11:22.062696
868	371	9	0.00	49.95		2026-02-04 16:11:27.884412
869	371	16	49.95	0.00		2026-02-04 16:11:27.884412
870	372	9	0.00	639.00		2026-02-04 16:11:35.16716
871	372	2	639.00	0.00		2026-02-04 16:11:35.16716
872	373	9	0.00	428.00		2026-02-04 16:11:43.977294
873	373	23	428.00	0.00		2026-02-04 16:11:43.977294
874	374	9	0.00	20.00		2026-02-04 16:11:48.789714
875	374	16	20.00	0.00		2026-02-04 16:11:48.789714
876	375	9	0.00	293.00		2026-02-04 16:11:58.572703
877	375	5	293.00	0.00		2026-02-04 16:11:58.572703
878	376	9	0.00	72.27		2026-02-04 16:12:03.283317
879	376	16	72.27	0.00		2026-02-04 16:12:03.283317
880	377	9	0.00	54.95		2026-02-04 16:12:12.294852
881	377	7	54.95	0.00		2026-02-04 16:12:12.294852
882	378	9	0.00	1576.00		2026-02-04 16:12:23.413091
883	378	25	1576.00	0.00		2026-02-04 16:12:23.413091
884	379	9	0.00	1380.00		2026-02-04 16:12:32.343686
885	379	20	1380.00	0.00		2026-02-04 16:12:32.343686
888	380	9	0.00	628.40		2026-02-04 16:13:21.457634
889	380	21	628.40	0.00		2026-02-04 16:13:21.457634
890	293	9	0.00	553.63		2026-02-04 16:13:28.354108
891	293	21	553.63	0.00		2026-02-04 16:13:28.354108
892	381	9	0.00	1100.00		2026-02-04 16:14:33.519411
893	381	7	456.00	0.00	mediciner	2026-02-04 16:14:33.519411
894	381	8	644.00	0.00	Kontakt växellåda	2026-02-04 16:14:33.519411
895	382	9	0.00	320.00		2026-02-16 13:53:24.378039
896	382	32	320.00	0.00		2026-02-16 13:53:24.378039
897	383	9	0.00	518.61		2026-02-16 13:53:28.666518
898	383	7	518.61	0.00		2026-02-16 13:53:28.666518
899	384	9	0.00	1055.19		2026-02-16 13:53:31.884341
900	384	7	1055.19	0.00		2026-02-16 13:53:31.884341
901	385	9	0.00	75.99		2026-02-16 13:53:37.39247
902	385	16	75.99	0.00		2026-02-16 13:53:37.39247
903	386	9	0.00	18.75		2026-02-16 13:53:47.709639
904	386	40	18.75	0.00		2026-02-16 13:53:47.709639
905	387	9	0.00	109.00		2026-02-16 13:53:52.934364
906	387	14	109.00	0.00		2026-02-16 13:53:52.934364
907	388	9	0.00	72.27		2026-02-16 13:53:56.89123
908	388	16	72.27	0.00		2026-02-16 13:53:56.89123
909	389	9	0.00	17.00		2026-02-16 13:54:01.377209
910	389	40	17.00	0.00		2026-02-16 13:54:01.377209
911	390	9	0.00	122.00		2026-02-16 13:54:06.545232
912	390	16	122.00	0.00		2026-02-16 13:54:06.545232
913	391	9	0.00	299.00		2026-02-16 13:54:15.086745
914	391	8	299.00	0.00		2026-02-16 13:54:15.086745
915	392	9	0.00	291.00		2026-02-16 13:54:23.379499
916	392	16	291.00	0.00		2026-02-16 13:54:23.379499
917	393	9	0.00	39.95		2026-02-16 13:54:27.253012
918	393	7	39.95	0.00		2026-02-16 13:54:27.253012
919	394	9	0.00	308.14		2026-02-16 13:54:31.052791
920	394	7	308.14	0.00		2026-02-16 13:54:31.052791
921	395	9	0.00	283.30		2026-02-16 13:54:34.69995
922	395	7	283.30	0.00		2026-02-16 13:54:34.69995
923	396	9	0.00	209.85		2026-02-16 13:54:38.154967
924	396	7	209.85	0.00		2026-02-16 13:54:38.154967
925	397	9	0.00	127.75		2026-02-16 13:54:42.035802
926	397	7	127.75	0.00		2026-02-16 13:54:42.035802
927	398	9	0.00	128.80		2026-02-16 13:54:45.498107
928	398	7	128.80	0.00		2026-02-16 13:54:45.498107
929	399	9	0.00	245.80		2026-02-16 13:54:50.215293
930	399	7	245.80	0.00		2026-02-16 13:54:50.215293
931	400	9	0.00	89.00		2026-02-16 13:54:54.477343
932	400	7	89.00	0.00		2026-02-16 13:54:54.477343
933	401	9	0.00	139.00		2026-02-16 13:54:59.192955
934	401	16	139.00	0.00		2026-02-16 13:54:59.192955
935	402	9	0.00	406.30		2026-02-16 13:56:31.875445
936	402	24	406.30	0.00		2026-02-16 13:56:31.875445
937	403	9	0.00	8000.00		2026-03-04 11:57:17.531633
938	403	45	8000.00	0.00		2026-03-04 11:57:17.531633
939	404	29	4000.00	0.00		2026-03-04 11:57:52.924727
940	404	30	4000.00	0.00		2026-03-04 11:57:52.924727
941	404	45	0.00	8000.00		2026-03-04 11:57:52.924727
942	405	9	0.00	98.00		2026-03-04 14:34:44.059313
943	405	32	98.00	0.00		2026-03-04 14:34:44.059313
944	406	9	0.00	280.00		2026-03-04 14:35:03.286072
945	406	32	280.00	0.00		2026-03-04 14:35:03.286072
946	407	9	0.00	8.33		2026-03-04 14:35:09.922852
947	407	40	8.33	0.00		2026-03-04 14:35:09.922852
948	408	9	0.00	14.50		2026-03-04 14:35:13.848307
949	408	40	14.50	0.00		2026-03-04 14:35:13.848307
950	409	9	0.00	72.00		2026-03-04 14:35:23.362214
951	409	16	72.00	0.00		2026-03-04 14:35:23.362214
952	410	9	0.00	100.00		2026-03-04 14:35:29.759494
953	410	17	100.00	0.00		2026-03-04 14:35:29.759494
954	411	9	0.00	189.00		2026-03-04 14:35:34.121593
955	411	14	189.00	0.00		2026-03-04 14:35:34.121593
964	416	9	0.00	151.00		2026-03-04 14:36:33.467297
965	416	38	151.00	0.00		2026-03-04 14:36:33.467297
966	417	9	0.00	141.00		2026-03-04 14:36:42.140919
967	417	47	141.00	0.00		2026-03-04 14:36:42.140919
968	418	9	0.00	428.00		2026-03-04 14:36:55.467575
969	418	23	428.00	0.00		2026-03-04 14:36:55.467575
970	419	9	0.00	1696.00		2026-03-04 14:37:10.844856
971	419	25	1696.00	0.00		2026-03-04 14:37:10.844856
972	420	9	0.00	1576.00		2026-03-04 14:37:17.375554
973	420	25	1576.00	0.00		2026-03-04 14:37:17.375554
974	421	9	0.00	52.87		2026-03-04 14:37:24.782336
975	421	7	52.87	0.00		2026-03-04 14:37:24.782336
976	422	9	0.00	235.00		2026-03-04 14:37:33.491676
977	422	26	235.00	0.00		2026-03-04 14:37:33.491676
980	424	9	0.00	4074.00		2026-03-04 14:38:24.673246
981	424	19	4074.00	0.00		2026-03-04 14:38:24.673246
982	425	9	0.00	235.00		2026-03-04 14:38:30.521102
983	425	26	235.00	0.00		2026-03-04 14:38:30.521102
984	426	9	0.00	1805.74		2026-03-04 14:38:40.656367
985	426	7	1805.74	0.00		2026-03-04 14:38:40.656367
986	427	9	0.00	35.00		2026-03-04 14:38:44.911539
987	427	14	35.00	0.00		2026-03-04 14:38:44.911539
988	428	9	0.00	35.00		2026-03-04 14:38:48.543049
989	428	14	35.00	0.00		2026-03-04 14:38:48.543049
990	429	9	8308.20	0.00		2026-03-04 14:38:54.813899
991	429	13	0.00	8308.20		2026-03-04 14:38:54.813899
992	430	9	35386.48	0.00		2026-03-04 14:39:03.688616
993	430	13	0.00	35386.48		2026-03-04 14:39:03.688616
994	431	9	0.00	288.00		2026-03-04 14:39:08.627144
995	431	6	288.00	0.00		2026-03-04 14:39:08.627144
996	432	9	0.00	1000.00		2026-03-04 14:39:15.904567
997	432	28	1000.00	0.00		2026-03-04 14:39:15.904567
998	433	9	0.00	1000.00		2026-03-04 14:39:28.725833
999	433	28	1000.00	0.00		2026-03-04 14:39:28.725833
1000	434	9	0.00	211.00		2026-03-04 14:39:32.906874
1001	434	16	211.00	0.00		2026-03-04 14:39:32.906874
1002	435	9	0.00	516.82		2026-03-04 14:39:37.426562
1003	435	7	516.82	0.00		2026-03-04 14:39:37.426562
1004	436	9	0.00	50.80		2026-03-04 14:39:43.456937
1005	436	7	50.80	0.00		2026-03-04 14:39:43.456937
1006	437	9	0.00	16.25		2026-03-04 14:39:49.902356
1007	437	40	16.25	0.00		2026-03-04 14:39:49.902356
1008	438	9	0.00	1162.84		2026-03-04 14:39:54.575076
1009	438	1	1162.84	0.00		2026-03-04 14:39:54.575076
1010	439	9	0.00	58.11		2026-03-04 14:40:00.135095
1011	439	16	58.11	0.00		2026-03-04 14:40:00.135095
1012	440	9	0.00	280.00		2026-03-04 14:40:05.440393
1013	440	16	280.00	0.00		2026-03-04 14:40:05.440393
1014	441	9	0.00	370.30		2026-03-04 14:40:11.076679
1015	441	7	370.30	0.00		2026-03-04 14:40:11.076679
1016	442	9	0.00	17.50		2026-03-04 14:40:15.209786
1017	442	40	17.50	0.00		2026-03-04 14:40:15.209786
1018	443	9	0.00	158.85		2026-03-04 14:40:20.834804
1019	443	7	158.85	0.00		2026-03-04 14:40:20.834804
1020	444	9	0.00	209.00		2026-03-04 14:40:30.259669
1021	444	7	209.00	0.00		2026-03-04 14:40:30.259669
1022	445	9	3161.00	0.00		2026-03-04 14:41:06.474598
1023	445	49	0.00	3161.00		2026-03-04 14:41:06.474598
1024	446	9	0.00	3523.00		2026-03-04 14:41:45.115749
1025	446	50	3523.00	0.00		2026-03-04 14:41:45.115749
1026	447	9	0.00	639.00		2026-03-04 14:42:20.416415
1027	447	2	639.00	0.00		2026-03-04 14:42:20.416415
1028	448	9	0.00	41.97		2026-03-04 14:42:24.934671
1029	448	7	41.97	0.00		2026-03-04 14:42:24.934671
1030	449	9	0.00	16.50		2026-03-04 14:42:30.611499
1031	449	40	16.50	0.00		2026-03-04 14:42:30.611499
1032	450	9	0.00	15.75		2026-03-04 14:42:34.816775
1033	450	40	15.75	0.00		2026-03-04 14:42:34.816775
1034	451	9	0.00	16.50		2026-03-04 14:42:39.318983
1035	451	40	16.50	0.00		2026-03-04 14:42:39.318983
1036	452	9	0.00	12.49		2026-03-04 14:42:44.579033
1037	452	14	12.49	0.00		2026-03-04 14:42:44.579033
1038	453	9	0.00	604.57		2026-03-04 14:43:25.751362
1039	453	21	604.57	0.00		2026-03-04 14:43:25.751362
1040	454	9	0.00	293.00		2026-03-04 14:43:40.598417
1041	454	5	293.00	0.00		2026-03-04 14:43:40.598417
1042	455	9	0.00	216.00		2026-03-04 14:43:46.302813
1043	455	24	216.00	0.00		2026-03-04 14:43:46.302813
1044	456	46	288.00	0.00		2026-03-04 14:44:38.729568
1045	456	50	0.00	288.00		2026-03-04 14:44:38.729568
1046	423	9	0.00	72.00		2026-03-04 14:46:37.721896
1047	423	38	72.00	0.00		2026-03-04 14:46:37.721896
1048	457	45	0.00	13000.00		2026-03-04 14:50:56.097228
1049	457	27	13000.00	0.00		2026-03-04 14:50:56.097228
1050	458	20	193.00	0.00		2026-03-04 14:52:03.456616
1051	458	45	0.00	193.00		2026-03-04 14:52:03.456616
1052	459	45	0.00	1380.00		2026-03-04 14:52:26.944993
1053	459	20	1380.00	0.00		2026-03-04 14:52:26.944993
1054	413	9	0.00	193.00		2026-03-04 14:52:37.026292
1055	413	45	193.00	0.00		2026-03-04 14:52:37.026292
1056	412	9	0.00	1380.00		2026-03-04 14:52:45.429468
1057	412	45	1380.00	0.00		2026-03-04 14:52:45.429468
1058	460	26	160.00	0.00		2026-03-04 14:53:47.064105
1059	460	45	0.00	160.00		2026-03-04 14:53:47.064105
1060	461	26	160.00	0.00		2026-03-04 14:54:00.27106
1061	461	45	0.00	160.00		2026-03-04 14:54:00.27106
1062	415	9	0.00	160.00		2026-03-04 14:54:07.045025
1063	415	45	160.00	0.00		2026-03-04 14:54:07.045025
1064	414	9	0.00	160.00		2026-03-04 14:54:12.460523
1065	414	45	160.00	0.00		2026-03-04 14:54:12.460523
1066	462	9	0.00	17.95		2026-03-30 16:59:54.559581
1067	462	7	17.95	0.00		2026-03-30 16:59:54.559581
1068	463	9	0.00	389.30		2026-03-30 17:00:05.975418
1069	463	24	389.30	0.00		2026-03-30 17:00:05.975418
1070	464	9	0.00	1137.70		2026-03-30 17:01:59.957368
1071	464	24	1137.70	0.00		2026-03-30 17:01:59.957368
1072	465	9	0.00	275.30		2026-03-30 17:02:07.877265
1073	465	24	275.30	0.00		2026-03-30 17:02:07.877265
1074	466	9	0.00	120.60		2026-03-30 17:02:12.967206
1075	466	24	120.60	0.00		2026-03-30 17:02:12.967206
1078	468	9	0.00	639.00		2026-03-30 17:02:44.085929
1079	468	2	639.00	0.00		2026-03-30 17:02:44.085929
1080	469	9	0.00	293.00		2026-03-30 17:02:53.205475
1081	469	5	293.00	0.00		2026-03-30 17:02:53.205475
1082	470	9	0.00	46.80		2026-03-30 17:02:57.362734
1083	470	7	46.80	0.00		2026-03-30 17:02:57.362734
1084	471	9	0.00	428.00		2026-03-30 17:03:01.015594
1085	471	23	428.00	0.00		2026-03-30 17:03:01.015594
1086	472	9	0.00	1303.31		2026-03-30 17:03:04.206958
1087	472	1	1303.31	0.00		2026-03-30 17:03:04.206958
1088	473	9	0.00	89.00		2026-03-30 17:03:09.278465
1089	473	16	89.00	0.00		2026-03-30 17:03:09.278465
1090	474	9	0.00	1304.23		2026-03-30 17:03:12.668713
1091	474	7	1304.23	0.00		2026-03-30 17:03:12.668713
1092	475	9	0.00	8000.00		2026-03-30 17:03:28.921428
1093	475	30	4000.00	0.00		2026-03-30 17:03:28.921428
1094	475	29	4000.00	0.00		2026-03-30 17:03:28.921428
1095	476	9	0.00	35.00		2026-03-30 17:03:32.885558
1096	476	14	35.00	0.00		2026-03-30 17:03:32.885558
1097	477	9	0.00	35.00		2026-03-30 17:03:37.770963
1098	477	14	35.00	0.00		2026-03-30 17:03:37.770963
1099	478	9	0.00	1000.00		2026-03-30 17:03:42.806363
1100	478	28	1000.00	0.00		2026-03-30 17:03:42.806363
1101	479	9	0.00	1000.00		2026-03-30 17:03:46.977298
1102	479	28	1000.00	0.00		2026-03-30 17:03:46.977298
1103	480	9	32500.00	0.00		2026-03-30 17:03:56.820806
1104	480	13	0.00	32500.00		2026-03-30 17:03:56.820806
1105	481	9	0.00	45.00		2026-03-30 17:04:02.130246
1106	481	24	45.00	0.00		2026-03-30 17:04:02.130246
1107	482	9	0.00	739.60		2026-03-30 17:04:05.773219
1108	482	24	739.60	0.00		2026-03-30 17:04:05.773219
1109	483	9	0.00	99.83		2026-03-30 17:04:09.290326
1110	483	16	99.83	0.00		2026-03-30 17:04:09.290326
1111	484	9	0.00	364.60		2026-03-30 17:04:14.570259
1112	484	7	364.60	0.00		2026-03-30 17:04:14.570259
1113	485	9	0.00	69.29		2026-03-30 17:04:18.261645
1114	485	7	69.29	0.00		2026-03-30 17:04:18.261645
1115	486	9	0.00	320.94		2026-03-30 17:04:22.093452
1116	486	7	320.94	0.00		2026-03-30 17:04:22.093452
1117	487	9	0.00	40.00		2026-03-30 17:04:35.30222
1118	487	15	40.00	0.00		2026-03-30 17:04:35.30222
1119	488	9	0.00	519.00		2026-03-30 17:04:45.759452
1120	488	36	519.00	0.00		2026-03-30 17:04:45.759452
1121	489	9	0.00	33.54		2026-03-30 17:04:49.132456
1122	489	7	33.54	0.00		2026-03-30 17:04:49.132456
1123	490	9	0.00	80.00		2026-03-30 17:04:59.365429
1124	490	15	80.00	0.00		2026-03-30 17:04:59.365429
1125	491	9	0.00	40.00		2026-03-30 17:05:03.428058
1126	491	15	40.00	0.00		2026-03-30 17:05:03.428058
1127	492	9	0.00	11.58		2026-03-30 17:05:07.646258
1128	492	40	11.58	0.00		2026-03-30 17:05:07.646258
1129	493	9	0.00	1277.03		2026-03-30 17:05:25.913384
1130	493	7	1277.03	0.00		2026-03-30 17:05:25.913384
1131	494	9	0.00	667.48		2026-03-30 17:05:29.098922
1132	494	7	667.48	0.00		2026-03-30 17:05:29.098922
1133	495	9	0.00	159.40		2026-03-30 17:05:36.881956
1134	495	24	159.40	0.00		2026-03-30 17:05:36.881956
1135	496	9	0.00	109.00		2026-03-30 17:05:41.53278
1136	496	14	109.00	0.00		2026-03-30 17:05:41.53278
1137	497	9	0.00	13000.00		2026-03-30 17:05:49.322687
1138	497	27	13000.00	0.00		2026-03-30 17:05:49.322687
1139	498	9	0.00	18.50		2026-03-30 17:05:53.795489
1140	498	40	18.50	0.00		2026-03-30 17:05:53.795489
1141	499	9	0.00	325.89		2026-03-30 17:05:57.554122
1142	499	7	325.89	0.00		2026-03-30 17:05:57.554122
1143	500	9	0.00	1361.95		2026-03-30 17:06:01.089965
1144	500	7	1361.95	0.00		2026-03-30 17:06:01.089965
1145	501	9	0.00	270.00		2026-03-30 17:06:44.109899
1146	501	16	270.00	0.00		2026-03-30 17:06:44.109899
1147	502	9	0.00	16.50		2026-03-30 17:06:50.047611
1148	502	40	16.50	0.00		2026-03-30 17:06:50.047611
1149	503	9	0.00	17.50		2026-03-30 17:06:56.825125
1150	503	40	17.50	0.00		2026-03-30 17:06:56.825125
1151	504	9	0.00	5.92		2026-03-30 17:06:59.97191
1152	504	40	5.92	0.00		2026-03-30 17:06:59.97191
1153	505	9	0.00	60.00		2026-03-30 17:07:13.261289
1154	505	7	60.00	0.00		2026-03-30 17:07:13.261289
1155	506	9	0.00	40.00		2026-03-30 17:07:29.088096
1156	506	15	40.00	0.00		2026-03-30 17:07:29.088096
1157	507	9	0.00	90.00		2026-03-30 17:07:41.133169
1158	507	33	90.00	0.00		2026-03-30 17:07:41.133169
1159	508	9	90.00	0.00		2026-03-30 17:07:54.50184
1160	508	33	0.00	90.00		2026-03-30 17:07:54.50184
1161	509	9	0.00	67.05		2026-03-30 17:08:03.422086
1162	509	16	67.05	0.00		2026-03-30 17:08:03.422086
1163	510	9	0.00	678.20		2026-03-30 17:08:14.671127
1164	510	24	678.20	0.00		2026-03-30 17:08:14.671127
1165	511	9	0.00	6000.00		2026-03-30 17:08:29.403209
1166	511	37	6000.00	0.00		2026-03-30 17:08:29.403209
1167	512	9	0.00	231.60		2026-03-30 17:08:34.209023
1168	512	7	231.60	0.00		2026-03-30 17:08:34.209023
1169	513	9	0.00	334.73		2026-03-30 17:08:42.772972
1170	513	24	334.73	0.00		2026-03-30 17:08:42.772972
1171	514	9	0.00	189.00		2026-07-02 21:10:55.512979
1172	514	14	189.00	0.00		2026-07-02 21:10:55.512979
1173	515	9	0.00	480.01		2026-07-02 21:11:01.53975
1174	515	7	480.01	0.00		2026-07-02 21:11:01.53975
1175	516	9	0.00	558.00		2026-07-02 21:11:28.745013
1176	516	32	558.00	0.00		2026-07-02 21:11:28.745013
1177	517	9	0.00	500.00		2026-07-02 21:11:42.131329
1178	517	7	500.00	0.00		2026-07-02 21:11:42.131329
1179	518	9	0.00	46.99		2026-07-02 21:11:57.148941
1180	518	7	46.99	0.00		2026-07-02 21:11:57.148941
1181	519	9	0.00	288.00		2026-07-02 21:12:06.360738
1182	519	16	288.00	0.00		2026-07-02 21:12:06.360738
1183	520	9	0.00	152.00		2026-07-02 21:12:10.460473
1184	520	16	152.00	0.00		2026-07-02 21:12:10.460473
1185	521	9	0.00	1945.00		2026-07-02 21:12:18.715735
1186	521	24	1945.00	0.00		2026-07-02 21:12:18.715735
1187	522	9	0.00	209.00		2026-07-02 21:12:25.3445
1188	522	16	209.00	0.00		2026-07-02 21:12:25.3445
1189	523	9	0.00	1380.00		2026-07-02 21:12:49.653125
1190	523	20	1380.00	0.00		2026-07-02 21:12:49.653125
1191	524	9	0.00	173.00		2026-07-02 21:12:56.930537
1192	524	20	173.00	0.00		2026-07-02 21:12:56.930537
1193	525	9	0.00	160.00		2026-07-02 21:13:10.55324
1194	525	26	160.00	0.00		2026-07-02 21:13:10.55324
1195	526	9	0.00	160.00		2026-07-02 21:13:18.960671
1196	526	26	160.00	0.00		2026-07-02 21:13:18.960671
1197	527	9	0.00	4074.00		2026-07-02 21:13:30.185906
1198	527	19	4074.00	0.00		2026-07-02 21:13:30.185906
1199	467	9	9783.00	0.00		2026-07-02 21:14:28.128166
1200	467	13	0.00	9783.00		2026-07-02 21:14:28.128166
1201	528	9	0.00	43.00		2026-07-02 21:14:43.112493
1202	528	15	43.00	0.00		2026-07-02 21:14:43.112493
1203	529	9	0.00	721.91		2026-07-02 21:14:52.992003
1204	529	7	721.91	0.00		2026-07-02 21:14:52.992003
1205	530	9	0.00	19.80		2026-07-02 21:14:57.74738
1206	530	7	19.80	0.00		2026-07-02 21:14:57.74738
1207	531	9	0.00	22.63		2026-07-02 21:15:03.212517
1208	531	7	22.63	0.00		2026-07-02 21:15:03.212517
1209	532	9	0.00	171.00		2026-07-02 21:15:07.450697
1210	532	16	171.00	0.00		2026-07-02 21:15:07.450697
1211	533	9	0.00	8000.00		2026-07-02 21:15:36.828099
1212	533	29	4000.00	0.00		2026-07-02 21:15:36.828099
1213	533	30	4000.00	0.00		2026-07-02 21:15:36.828099
1214	534	9	0.00	189.00		2026-07-02 21:15:46.505273
1215	534	14	189.00	0.00		2026-07-02 21:15:46.505273
1216	535	9	0.00	12.00		2026-07-02 21:15:58.309041
1217	535	16	12.00	0.00		2026-07-02 21:15:58.309041
1218	536	9	0.00	323.98		2026-07-02 21:16:03.746934
1219	536	7	323.98	0.00		2026-07-02 21:16:03.746934
1220	537	9	0.00	1696.00		2026-07-02 21:16:19.14702
1221	537	25	1696.00	0.00		2026-07-02 21:16:19.14702
1222	538	9	0.00	1576.00		2026-07-02 21:16:26.820579
1223	538	25	1576.00	0.00		2026-07-02 21:16:26.820579
1224	539	9	0.00	235.00		2026-07-02 21:16:34.707049
1225	539	26	235.00	0.00		2026-07-02 21:16:34.707049
1226	540	9	0.00	235.00		2026-07-02 21:16:39.48056
1227	540	26	235.00	0.00		2026-07-02 21:16:39.48056
1228	541	9	0.00	4074.00		2026-07-02 21:16:55.177967
1229	541	19	4074.00	0.00		2026-07-02 21:16:55.177967
1230	542	9	0.00	260.00		2026-07-02 21:17:05.058776
1231	542	16	260.00	0.00		2026-07-02 21:17:05.058776
1232	543	9	0.00	160.00		2026-07-02 21:17:11.759679
1233	543	26	160.00	0.00		2026-07-02 21:17:11.759679
1234	544	9	0.00	112.00		2026-07-02 21:17:17.585167
1235	544	16	112.00	0.00		2026-07-02 21:17:17.585167
1236	545	9	0.00	428.00		2026-07-02 21:17:55.792258
1237	545	23	428.00	0.00		2026-07-02 21:17:55.792258
1238	546	9	0.00	397.74		2026-07-02 21:18:04.884831
1239	546	7	397.74	0.00		2026-07-02 21:18:04.884831
1240	547	9	32304.00	0.00		2026-07-02 21:18:20.443622
1241	547	13	0.00	32304.00		2026-07-02 21:18:20.443622
1242	548	9	2310.06	0.00		2026-07-02 21:18:30.230442
1243	548	13	0.00	2310.06		2026-07-02 21:18:30.230442
1244	549	9	0.00	137.00		2026-07-02 21:18:36.219864
1245	549	16	137.00	0.00		2026-07-02 21:18:36.219864
1246	550	9	0.00	148.43		2026-07-02 21:18:43.117415
1247	550	7	148.43	0.00		2026-07-02 21:18:43.117415
1248	551	9	0.00	58.60		2026-07-02 21:18:49.587676
1249	551	7	58.60	0.00		2026-07-02 21:18:49.587676
\.


--
-- Data for Name: recurring_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recurring_items (id, namn, expected_per_month, active_months, created_at) FROM stdin;
1	Föreningsavgift bostad	1	{1,2,3,4,5,6,7,8,9,10,11,12}	2025-12-22 21:24:51.950355
2	Lön	2	{1,2,3,4,5,6,7,8,9,10,11,12}	2025-12-22 21:30:20.501277
3	Bolåneränta	2	{1,2,3,4,5,6,7,8,9,10,11,12}	2025-12-22 22:29:55.005522
5	Bilförsäkring	1	{1,2,3,4,5,6,7,8,9,10,11,12}	2025-12-22 22:42:26.384644
7	Pension	2	{1,2,3,4,5,6,7,8,9,10,11,12}	2025-12-22 23:15:48.140179
9	Hemförsäkring	1	{1,2,3,4,5,6,7,8,9,10,11,12}	2026-01-02 14:26:27.889029
10	Olycksfallsförsäkringar	2	{1,2,3,4,5,6,7,8,9,10,11,12}	2026-01-02 14:26:41.017245
11	Djurförsäkring	1	{1,2,3,4,5,6,7,8,9,10,11,12}	2026-01-02 14:27:43.554848
6	Facket/A-kassa	4	{1,2,3,4,5,6,7,8,9,10,11,12}	2025-12-22 22:57:07.434888
12	Bilskatt	1	{1,2,3,4,5,6,7,8,9,10,11,12}	2026-01-23 10:22:55.108342
13	El	1	{1,2,3,4,5,6,7,8,9,10,11,12}	2026-02-04 16:13:00.851546
4	Avbetalning studielån	2	{1,2,3,4,5,6,7,8,9,10,11,12}	2025-12-22 22:36:42.096919
\.


--
-- Data for Name: template_rows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_rows (id, template_id, account_id, is_debet, description, row_order, created_at) FROM stdin;
1	1	9	t		0	2025-12-22 21:38:13.008149
2	1	13	f		1	2025-12-22 21:38:13.008149
3	2	9	f		0	2025-12-22 21:38:39.938561
4	2	7	t		1	2025-12-22 21:38:39.938561
5	3	9	f		0	2025-12-22 22:13:59.116358
6	3	15	t		1	2025-12-22 22:13:59.116358
7	4	9	f		0	2025-12-22 22:19:08.809523
8	4	14	t		1	2025-12-22 22:19:08.809523
9	5	9	f		0	2025-12-22 22:19:36.738188
10	5	5	t		1	2025-12-22 22:19:36.738188
11	6	9	f		0	2025-12-22 22:30:25.266401
12	6	20	t		1	2025-12-22 22:30:25.266401
13	7	9	f		0	2025-12-22 22:37:05.648618
14	7	25	t		1	2025-12-22 22:37:05.648618
15	8	9	f		0	2025-12-22 22:56:53.871221
16	8	26	t		1	2025-12-22 22:56:53.871221
17	9	9	f		0	2025-12-22 23:15:28.501838
18	9	28	t		1	2025-12-22 23:15:28.501838
\.


--
-- Data for Name: transaction_recurring_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_recurring_items (id, transaction_id, recurring_item_id, created_at) FROM stdin;
5	40	4	2025-12-22 22:37:08.751085
6	45	5	2025-12-22 22:46:57.976053
7	46	1	2025-12-22 22:49:42.042073
8	47	6	2025-12-22 22:58:10.435946
9	48	6	2025-12-22 22:58:25.208279
10	50	6	2025-12-22 22:59:51.90601
11	53	2	2025-12-22 23:05:52.70831
12	54	2	2025-12-22 23:06:00.099937
13	60	7	2025-12-22 23:16:03.970864
14	56	7	2025-12-22 23:16:09.521728
16	102	6	2025-12-23 00:09:27.323569
17	103	1	2025-12-23 00:09:48.000822
18	105	4	2025-12-23 00:10:11.250751
19	106	3	2025-12-23 00:10:36.76962
20	107	3	2025-12-23 00:10:54.060415
21	110	6	2025-12-23 00:11:23.2653
22	117	7	2025-12-23 00:12:51.85556
23	118	6	2025-12-23 00:13:04.934509
24	119	5	2025-12-23 00:13:15.19229
25	122	2	2025-12-23 00:13:46.773163
26	123	2	2025-12-23 00:13:57.663521
27	131	7	2025-12-23 00:14:59.811457
28	238	7	2025-12-29 14:58:13.554311
29	241	6	2025-12-29 14:58:51.081848
30	242	6	2025-12-29 14:58:57.411009
31	248	7	2025-12-29 15:17:01.20364
33	263	1	2026-01-01 14:43:01.465465
36	269	4	2026-01-01 17:34:38.547942
37	270	5	2026-01-01 17:34:51.831421
38	272	6	2026-01-01 17:35:06.903379
46	287	3	2026-01-01 23:59:21.546153
47	288	3	2026-01-01 23:59:50.623205
49	283	3	2026-01-02 00:06:44.334213
50	278	3	2026-01-02 00:06:51.507322
52	95	10	2026-01-02 14:29:13.399366
53	27	10	2026-01-02 14:29:19.896266
54	86	10	2026-01-02 14:30:21.632114
55	240	11	2026-01-02 14:30:39.48852
56	59	11	2026-01-02 14:30:44.178339
57	121	11	2026-01-02 14:30:47.936028
58	28	9	2026-01-02 14:30:56.488646
59	91	9	2026-01-02 14:31:00.906216
60	290	10	2026-01-07 00:45:18.465846
61	291	9	2026-01-07 00:45:33.683384
62	1	2	2026-01-11 11:23:55.399007
63	2	2	2026-01-11 11:24:01.535397
64	328	2	2026-01-23 09:45:09.130272
65	329	2	2026-01-23 09:45:16.879668
66	336	12	2026-01-23 10:23:17.996231
67	347	7	2026-01-26 08:46:31.228389
68	348	7	2026-01-26 08:46:40.951207
69	352	9	2026-02-04 16:07:35.555174
71	353	10	2026-02-04 16:09:15.937981
72	359	3	2026-02-04 16:10:00.94973
73	361	4	2026-02-04 16:10:23.779474
74	363	1	2026-02-04 16:10:41.47635
75	367	6	2026-02-04 16:11:07.437279
76	368	6	2026-02-04 16:11:12.367782
77	369	6	2026-02-04 16:11:18.083498
78	370	6	2026-02-04 16:11:22.080509
79	372	5	2026-02-04 16:11:35.188434
80	375	11	2026-02-04 16:11:58.59204
81	378	4	2026-02-04 16:12:23.431472
82	379	3	2026-02-04 16:12:32.363722
83	380	13	2026-02-04 16:13:21.478592
84	293	13	2026-02-04 16:13:28.371641
89	416	10	2026-03-04 14:36:33.489159
90	417	9	2026-03-04 14:36:42.161094
91	419	4	2026-03-04 14:37:10.865392
92	420	4	2026-03-04 14:37:17.392084
93	422	6	2026-03-04 14:37:33.507553
94	424	1	2026-03-04 14:38:24.692713
95	425	6	2026-03-04 14:38:30.537971
96	429	2	2026-03-04 14:38:54.830664
97	430	2	2026-03-04 14:39:03.706895
98	432	7	2026-03-04 14:39:15.929484
99	433	7	2026-03-04 14:39:28.749156
100	447	5	2026-03-04 14:42:20.433079
101	453	13	2026-03-04 14:43:25.77005
102	454	11	2026-03-04 14:43:40.615156
103	456	12	2026-03-04 14:44:38.75014
104	458	3	2026-03-04 14:52:03.477961
105	459	3	2026-03-04 14:52:26.968223
106	460	6	2026-03-04 14:53:47.081089
107	461	6	2026-03-04 14:54:00.290292
109	468	5	2026-03-30 17:02:44.132222
110	469	11	2026-03-30 17:02:53.235296
111	478	7	2026-03-30 17:03:42.826653
112	479	7	2026-03-30 17:03:46.997863
113	480	2	2026-03-30 17:03:56.839895
114	523	3	2026-07-02 21:12:49.706211
115	524	3	2026-07-02 21:12:56.96502
116	525	6	2026-07-02 21:13:10.597412
117	526	6	2026-07-02 21:13:19.017954
118	527	1	2026-07-02 21:13:30.225864
119	537	4	2026-07-02 21:16:19.193167
120	538	4	2026-07-02 21:16:26.856992
121	539	6	2026-07-02 21:16:34.753154
122	540	6	2026-07-02 21:16:39.515252
123	541	1	2026-07-02 21:16:55.228769
124	543	6	2026-07-02 21:17:11.807981
125	547	2	2026-07-02 21:18:20.486651
126	548	2	2026-07-02 21:18:30.32433
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, date, description, bank_event_id, created_at, original_transaction_id, period_shift_date, bridge_account_id) FROM stdin;
3	2025-12-20T00:00:00.000Z	Ica Årstahallen	3	2025-12-22 21:38:43.060305	\N	\N	\N
4	2025-12-19T00:00:00.000Z	Maxi Ica Storm Gnist	5	2025-12-22 21:38:59.234697	\N	\N	\N
5	2025-12-19T00:00:00.000Z	Apotek Hjärtat Ica M	4	2025-12-22 21:39:22.24137	\N	\N	\N
6	2025-12-17T00:00:00.000Z	Ica Kvantum	8	2025-12-22 22:06:19.31936	\N	\N	\N
7	2025-12-12T00:00:00.000Z	Netflix.Com	16	2025-12-22 22:10:53.007253	\N	\N	\N
8	2025-12-17T00:00:00.000Z	Ica Kvantum	9	2025-12-22 22:12:49.348723	\N	\N	\N
9	2025-12-15T00:00:00.000Z	Willys Uppsala Bjork	10	2025-12-22 22:12:53.225777	\N	\N	\N
10	2025-12-15T00:00:00.000Z	Ica Årstahallen	11	2025-12-22 22:12:57.457216	\N	\N	\N
11	2025-12-13T00:00:00.000Z	Ica Årstahallen	13	2025-12-22 22:13:02.112784	\N	\N	\N
12	2025-12-12T00:00:00.000Z	Ul Kollektivtr	14	2025-12-22 22:14:01.19846	\N	\N	\N
13	2025-12-11T00:00:00.000Z	Ul Kollektivtr	17	2025-12-22 22:14:05.767185	\N	\N	\N
14	2025-12-12T00:00:00.000Z	Ica Kvantum	15	2025-12-22 22:14:45.970316	\N	\N	\N
15	2025-12-08T00:00:00.000Z	Willys Uppsala Bjork	18	2025-12-22 22:14:50.744034	\N	\N	\N
16	2025-12-07T00:00:00.000Z	Maxi Ica Storm Gnist	19	2025-12-22 22:14:55.627988	\N	\N	\N
17	2025-12-06T00:00:00.000Z	Ica Årstahallen	23	2025-12-22 22:15:01.202727	\N	\N	\N
18	2025-12-06T00:00:00.000Z	Ica Årstahallen	24	2025-12-22 22:15:06.600435	\N	\N	\N
19	2025-12-06T00:00:00.000Z	Kaffe inför bilmeck	22	2025-12-22 22:16:10.424631	\N	\N	\N
20	2025-12-06T00:00:00.000Z	Reservdelar och verktyg	21	2025-12-22 22:16:27.483355	\N	\N	\N
21	2025-12-05T00:00:00.000Z	Ragusa	27	2025-12-22 22:18:15.787355	\N	\N	\N
22	2025-12-05T00:00:00.000Z	Hemkop Uppsala Svava	26	2025-12-22 22:18:21.054522	\N	\N	\N
23	2025-12-05T00:00:00.000Z	Willys Uppsala Bjork	28	2025-12-22 22:18:28.248944	\N	\N	\N
24	2025-12-04T00:00:00.000Z	Ica Kvantum	29	2025-12-22 22:18:33.270417	\N	\N	\N
25	2025-12-03T00:00:00.000Z	Maxi Ica Storm Gnist	32	2025-12-22 22:18:37.048681	\N	\N	\N
26	2025-12-02T00:00:00.000Z	Spotify P3d038657a	33	2025-12-22 22:19:18.743206	\N	\N	\N
29	2025-11-30T00:00:00.000Z	Sl App	44	2025-12-22 22:21:06.013671	\N	\N	\N
30	2025-11-29T00:00:00.000Z	Sl App	46	2025-12-22 22:21:10.366022	\N	\N	\N
31	2025-12-01T00:00:00.000Z	Okq8	34	2025-12-22 22:21:38.439401	\N	\N	\N
32	2025-12-01T00:00:00.000Z	Folktandvård	42	2025-12-22 22:29:36.706406	\N	\N	\N
35	2025-12-01T00:00:00.000Z	Stora Coop Bolanderna	35	2025-12-22 22:30:36.993578	\N	\N	\N
36	2025-11-29T00:00:00.000Z	Blomma Bjerkis	45	2025-12-22 22:31:38.568467	\N	\N	\N
37	2025-12-01T00:00:00.000Z	Kronans Apotek Ab	37	2025-12-22 22:32:53.243675	\N	\N	\N
38	2025-11-28T00:00:00.000Z	Kuddar och krafs	51	2025-12-22 22:34:15.849528	\N	\N	\N
39	2025-11-28T00:00:00.000Z	Täcken	47	2025-12-22 22:35:02.503452	\N	\N	\N
40	2025-11-28T00:00:00.000Z	Csn	53	2025-12-22 22:37:08.694395	\N	\N	\N
41	2025-11-28T00:00:00.000Z	Willys Uppsala Bjork	48	2025-12-22 22:37:27.794648	\N	\N	\N
42	2025-11-28T00:00:00.000Z	Rusta - 7 Uppsala Bola	49	2025-12-22 22:41:32.67451	\N	\N	\N
43	2025-11-28T00:00:00.000Z	Jysk Bolanderna	50	2025-12-22 22:41:44.561385	\N	\N	\N
44	2025-11-28T00:00:00.000Z	Comviq.Se	52	2025-12-22 22:41:57.491751	\N	\N	\N
45	2025-11-28T00:00:00.000Z	Ica Försäkr	56	2025-12-22 22:42:08.088939	\N	\N	\N
46	2025-11-28T00:00:00.000Z	Fastum Ubc	54	2025-12-22 22:49:41.990577	\N	\N	\N
47	2025-11-28T00:00:00.000Z	Union.Akassa	55	2025-12-22 22:56:57.1041	\N	\N	\N
48	2025-11-28T00:00:00.000Z	Union.Akassa	59	2025-12-22 22:58:25.144097	\N	\N	\N
49	2025-11-28T00:00:00.000Z	Wspa Sverige	57	2025-12-22 22:59:46.274105	\N	\N	\N
50	2025-11-28T00:00:00.000Z	Unionen	58	2025-12-22 22:59:51.851727	\N	\N	\N
52	2025-11-26T00:00:00.000Z	Ica Kvantum	65	2025-12-22 23:05:44.294698	\N	\N	\N
53	2025-11-25T00:00:00.000Z	I00000371748	75	2025-12-22 23:05:52.648982	\N	\N	\N
54	2025-11-25T00:00:00.000Z	I00000371779	76	2025-12-22 23:06:00.040687	\N	\N	\N
55	2025-11-28T00:00:00.000Z	Återbet Buffert	60	2025-12-22 23:11:15.978935	\N	\N	\N
57	2025-11-25T00:00:00.000Z	Överföring	72	2025-12-22 23:13:55.249277	\N	\N	\N
58	2025-12-03T00:00:00.000Z	Biltema Sweden Uppsala	30	2025-12-22 23:14:51.646732	\N	\N	\N
60	2025-11-25T00:00:00.000Z	Avanza Bank	73	2025-12-22 23:15:38.499062	\N	\N	\N
56	2025-11-25T00:00:00.000Z	Avanza Bank	74	2025-12-22 23:11:32.915979	\N	\N	\N
61	2025-11-23T00:00:00.000Z	Maxi Ica Storm Gnist	82	2025-12-22 23:16:17.976434	\N	\N	\N
62	2025-11-22T00:00:00.000Z	Prostatacancerforbund	87	2025-12-22 23:16:39.619285	\N	\N	\N
63	2025-11-22T00:00:00.000Z	Stora Coop Bolanderna	86	2025-12-22 23:16:48.127301	\N	\N	\N
64	2025-11-22T00:00:00.000Z	Loomisp Harrys Uppsala	88	2025-12-22 23:17:06.484162	\N	\N	\N
65	2025-11-17T00:00:00.000Z	Maxi Ica Storm Gnist	95	2025-12-22 23:17:24.141324	\N	\N	\N
66	2025-11-17T00:00:00.000Z	Zoo.Se Uppsala	94	2025-12-22 23:17:49.813265	\N	\N	\N
67	2025-11-21T00:00:00.000Z	Ul Kollektivtr	92	2025-12-22 23:17:54.34672	\N	\N	\N
68	2025-11-21T00:00:00.000Z	Ul Kollektivtr	93	2025-12-22 23:17:57.968343	\N	\N	\N
69	2025-11-15T00:00:00.000Z	Loomisp Harrys Uppsala	97	2025-12-22 23:18:08.736657	\N	\N	\N
70	2025-11-14T00:00:00.000Z	Vastmanland-Dal	100	2025-12-22 23:18:20.34773	\N	\N	\N
71	2025-11-15T00:00:00.000Z	Vastmanland-Dal	98	2025-12-22 23:18:30.292523	\N	\N	\N
72	2025-11-15T00:00:00.000Z	Cherry Konfektyr	99	2025-12-22 23:18:46.892784	\N	\N	\N
73	2025-11-15T00:00:00.000Z	Loomisp Harrys Uppsala	96	2025-12-22 23:18:55.136628	\N	\N	\N
74	2025-11-13T00:00:00.000Z	Prostatacancerfoerbund	102	2025-12-22 23:19:08.702191	\N	\N	\N
75	2025-11-13T00:00:00.000Z	Maxi Ica Storm Gnist	104	2025-12-22 23:19:13.895481	\N	\N	\N
76	2025-11-22T00:00:00.000Z	Loomisp Harrys Uppsala	83	2025-12-22 23:21:03.068027	\N	\N	\N
77	2025-11-12T00:00:00.000Z	Netflix.Com	106	2025-12-22 23:21:17.548033	\N	\N	\N
78	2025-11-11T00:00:00.000Z	Willys Uppsala Bjork	107	2025-12-22 23:21:23.108169	\N	\N	\N
79	2025-11-10T00:00:00.000Z	Ica Årstahallen	109	2025-12-22 23:21:28.107619	\N	\N	\N
80	2025-11-13T00:00:00.000Z	Apoteket Bolaenderna	103	2025-12-22 23:23:41.468242	\N	\N	\N
84	2025-12-19T00:00:00.000Z	Lån (men Emma betalade för veterinär)	7	2025-12-22 23:56:53.919567	\N	\N	\N
81	2025-11-25T00:00:00.000Z	Överföring	71	2025-12-22 23:26:06.724243	\N	\N	\N
82	2025-12-15T00:00:00.000Z	Uttag buffert	12	2025-12-22 23:54:03.822902	\N	\N	\N
83	2025-12-19T00:00:00.000Z	Överföring Till Ica Banks Konto	6	2025-12-22 23:56:01.540572	\N	\N	\N
85	2025-12-06T00:00:00.000Z	Överföring Till Ica Banks Konto	25	2025-12-22 23:59:04.482369	\N	\N	\N
87	2025-11-10T00:00:00.000Z	Överföring Till Ica Banks Konto	110	2025-12-23 00:04:37.401208	\N	\N	\N
88	2025-11-13T00:00:00.000Z	Överföring Till Ica Banks Konto	105	2025-12-23 00:04:46.992728	\N	\N	\N
89	2025-11-22T00:00:00.000Z	Biltema Sweden Uppsala	84	2025-12-23 00:07:49.682713	\N	\N	\N
90	2025-11-05T00:00:00.000Z	Willys Uppsala Bjork	124	2025-12-23 00:07:59.967674	\N	\N	\N
92	2025-11-05T00:00:00.000Z	Sl App	122	2025-12-23 00:08:26.427077	\N	\N	\N
91	2025-11-03T00:00:00.000Z	Hemförsäkring	134	2025-12-23 00:08:18.280733	\N	\N	\N
34	2025-12-01T00:00:00.000Z	Sbab	38	2025-12-22 22:30:29.791637	\N	\N	\N
33	2025-12-01T00:00:00.000Z	Sbab	40	2025-12-22 22:30:07.034536	\N	\N	\N
59	2025-11-27T00:00:00.000Z	Agria	63	2025-12-22 23:15:02.867778	\N	\N	\N
1	2025-12-22T00:00:00.000Z	Lön Viktor	1	2025-12-22 21:37:48.742466	\N	\N	\N
27	2025-12-01T00:00:00.000Z	Emma olycksfall	43	2025-12-22 22:20:47.179696	\N	\N	\N
28	2025-12-01T00:00:00.000Z	Hemförsäkring	41	2025-12-22 22:20:54.485628	\N	\N	\N
2	2025-12-22T00:00:00.000Z	Lön Emma	2	2025-12-22 21:38:19.547765	\N	\N	\N
93	2025-11-05T00:00:00.000Z	Sl App	123	2025-12-23 00:08:31.223527	\N	\N	\N
94	2025-11-03T00:00:00.000Z	Sl App	127	2025-12-23 00:08:35.777672	\N	\N	\N
96	2025-11-03T00:00:00.000Z	Ica Årstahallen	130	2025-12-23 00:08:47.787558	\N	\N	\N
97	2025-11-03T00:00:00.000Z	Ul Kollektivtr	125	2025-12-23 00:08:54.967732	\N	\N	\N
98	2025-11-03T00:00:00.000Z	Sl App	128	2025-12-23 00:08:59.125134	\N	\N	\N
99	2025-11-03T00:00:00.000Z	Ul Kollektivtr	126	2025-12-23 00:09:03.085873	\N	\N	\N
100	2025-11-02T00:00:00.000Z	Spotify P3c0d2419b	135	2025-12-23 00:09:14.795028	\N	\N	\N
101	2025-11-01T00:00:00.000Z	Willys Uppsala Bjork	136	2025-12-23 00:09:19.619396	\N	\N	\N
102	2025-10-31T00:00:00.000Z	Unionen	143	2025-12-23 00:09:27.273847	\N	\N	\N
103	2025-10-31T00:00:00.000Z	Fastum Ubc	141	2025-12-23 00:09:47.941256	\N	\N	\N
104	2025-10-31T00:00:00.000Z	Ica Årstahallen	138	2025-12-23 00:09:57.500141	\N	\N	\N
105	2025-10-31T00:00:00.000Z	Csn	142	2025-12-23 00:10:11.202998	\N	\N	\N
106	2025-10-30T00:00:00.000Z	Sbab	147	2025-12-23 00:10:36.710543	\N	\N	\N
107	2025-10-30T00:00:00.000Z	Sbab	149	2025-12-23 00:10:54.005527	\N	\N	\N
108	2025-10-30T00:00:00.000Z	Malardalstrafik Ab	145	2025-12-23 00:11:00.021491	\N	\N	\N
109	2025-11-03T00:00:00.000Z	41313008 Vattenfall Kundservice Ab	131	2025-12-23 00:11:10.873573	\N	\N	\N
110	2025-10-28T00:00:00.000Z	Union.Akassa	152	2025-12-23 00:11:23.213174	\N	\N	\N
111	2025-10-28T00:00:00.000Z	Wspa Sverige	155	2025-12-23 00:11:34.806411	\N	\N	\N
112	2025-10-28T00:00:00.000Z	Faboden	151	2025-12-23 00:11:44.709001	\N	\N	\N
113	2025-10-30T00:00:00.000Z	Ica Kvantum	146	2025-12-23 00:11:50.059916	\N	\N	\N
114	2025-11-03T00:00:00.000Z	Nytt Körkort	132	2025-12-23 00:12:03.381194	\N	\N	\N
116	2025-10-30T00:00:00.000Z	Coop Stationsgallerian	144	2025-12-23 00:12:16.604716	\N	\N	\N
117	2025-10-28T00:00:00.000Z	Pension Och Snabbmat	156	2025-12-23 00:12:51.791801	\N	\N	\N
118	2025-10-28T00:00:00.000Z	Union.Akassa	154	2025-12-23 00:13:04.882787	\N	\N	\N
119	2025-10-28T00:00:00.000Z	Ica Försäkr	153	2025-12-23 00:13:15.137446	\N	\N	\N
120	2025-10-27T00:00:00.000Z	Ul Kollektivtr	157	2025-12-23 00:13:20.438535	\N	\N	\N
122	2025-10-24T00:00:00.000Z	I00000368238	175	2025-12-23 00:13:46.71118	\N	\N	\N
123	2025-10-24T00:00:00.000Z	Överföring Till Ica Banks Konto	174	2025-12-23 00:13:57.611093	\N	\N	\N
124	2025-10-24T00:00:00.000Z	Willys Uppsala Granb	168	2025-12-23 00:14:02.775677	\N	\N	\N
126	2025-10-21T00:00:00.000Z	Maxi Ica Storm Stenh	180	2025-12-23 00:14:15.225525	\N	\N	\N
127	2025-10-20T00:00:00.000Z	Ica Årstahallen	182	2025-12-23 00:14:20.518491	\N	\N	\N
128	2025-10-19T00:00:00.000Z	Maxi Ica Storm Gnist	184	2025-12-23 00:14:25.29536	\N	\N	\N
129	2025-10-18T00:00:00.000Z	Okq8	185	2025-12-23 00:14:35.795232	\N	\N	\N
130	2025-10-17T00:00:00.000Z	Zoo.Se Uppsala	189	2025-12-23 00:14:45.894766	\N	\N	\N
131	2025-10-27T00:00:00.000Z	Avanza Bank	161	2025-12-23 00:14:59.761547	\N	\N	\N
132	2025-10-25T00:00:00.000Z	Ica Årstahallen	167	2025-12-23 00:15:04.718353	\N	\N	\N
133	2025-10-24T00:00:00.000Z	Överföring	173	2025-12-23 00:15:17.766756	\N	\N	\N
134	2025-10-24T00:00:00.000Z	Överföring	172	2025-12-23 00:15:34.714808	\N	\N	\N
135	2025-10-14T00:00:00.000Z	W Meds.Se	194	2025-12-23 00:15:46.095812	\N	\N	\N
136	2025-10-14T00:00:00.000Z	Maxi Ica Storm Stenh	195	2025-12-23 00:15:51.011902	\N	\N	\N
137	2025-10-12T00:00:00.000Z	Ica Årstahallen	197	2025-12-23 00:15:55.764988	\N	\N	\N
138	2025-10-11T00:00:00.000Z	Ica Årstahallen	199	2025-12-23 00:16:01.796728	\N	\N	\N
139	2025-10-11T00:00:00.000Z	Blomsterlandet	198	2025-12-23 00:16:17.987033	\N	\N	\N
140	2025-10-10T00:00:00.000Z	Albellise Onskefoto	204	2025-12-23 00:16:27.299573	\N	\N	\N
141	2025-10-10T00:00:00.000Z	Ica Årstahallen	205	2025-12-23 00:16:31.985113	\N	\N	\N
142	2025-10-10T00:00:00.000Z	Polisen 0301 Up	201	2025-12-23 00:16:43.473724	\N	\N	\N
143	2025-10-07T00:00:00.000Z	Ica Årstahallen	207	2025-12-23 00:16:47.385629	\N	\N	\N
144	2025-10-10T00:00:00.000Z	Granngarden Uppsala 42	202	2025-12-23 00:16:55.973534	\N	\N	\N
145	2025-10-06T00:00:00.000Z	Ica Årstahallen	208	2025-12-23 00:17:00.455296	\N	\N	\N
146	2025-10-04T00:00:00.000Z	Norrlands Natio	211	2025-12-23 00:17:19.574689	\N	\N	\N
147	2025-10-17T00:00:00.000Z	Google One	191	2025-12-23 00:18:37.165482	\N	\N	\N
148	2025-12-01T00:00:00.000Z	Vattenfall	39	2025-12-23 00:18:50.278765	\N	\N	\N
149	2025-11-26T00:00:00.000Z	Dryck & Mat I U	64	2025-12-23 09:22:27.489756	\N	\N	\N
150	2025-11-13T00:00:00.000Z	Mcduppsalafyrislund	101	2025-12-23 09:23:14.845271	\N	\N	\N
151	2025-11-23T00:00:00.000Z	Max Burgers 2010135 Ki	80	2025-12-23 09:23:28.7529	\N	\N	\N
152	2025-11-23T00:00:00.000Z	Loopia Ab	79	2025-12-23 09:28:44.838006	\N	\N	\N
153	2025-11-23T00:00:00.000Z	Loomisp Harrys Uppsala	81	2025-12-23 09:34:52.103512	\N	\N	\N
154	2025-12-01T00:00:00.000Z	Loopia Ab	36	2025-12-23 09:36:22.037815	\N	\N	\N
155	2025-11-09T00:00:00.000Z	St1 Ploq Nykopingsbro	115	2025-12-23 09:36:37.537696	\N	\N	\N
156	2025-11-09T00:00:00.000Z	Mangal Jonkoping	113	2025-12-23 09:36:47.30952	\N	\N	\N
157	2025-11-09T00:00:00.000Z	St1 Valkommen In Jonko	114	2025-12-23 09:36:55.508294	\N	\N	\N
158	2025-11-09T00:00:00.000Z	Chopchop Jonkop	116	2025-12-23 09:37:06.810411	\N	\N	\N
159	2025-11-06T00:00:00.000Z	Max Burgers 2010053 Ec	121	2025-12-23 09:37:14.865576	\N	\N	\N
160	2025-11-06T00:00:00.000Z	Preem	119	2025-12-23 09:37:23.142902	\N	\N	\N
161	2025-11-06T00:00:00.000Z	Maxi Ica Storm Gnist	120	2025-12-23 09:37:27.779083	\N	\N	\N
162	2025-11-06T00:00:00.000Z	St1 Ploq Norsborg S T	118	2025-12-23 09:37:39.857984	\N	\N	\N
163	2025-10-31T00:00:00.000Z	Överföring Till Ica Banks Konto	140	2025-12-23 09:37:54.602237	\N	\N	\N
164	2025-10-27T00:00:00.000Z	Ica Årstahallen	159	2025-12-23 09:37:59.292484	\N	\N	\N
165	2025-10-27T00:00:00.000Z	Amortering	160	2025-12-23 09:38:31.308183	\N	\N	\N
166	2025-10-26T00:00:00.000Z	Willys Uppsala Bjork	163	2025-12-23 09:38:37.209498	\N	\N	\N
167	2025-11-03T00:00:00.000Z	Pressbyran 4308650	129	2025-12-23 09:38:48.889714	\N	\N	\N
168	2025-11-09T00:00:00.000Z	St1 Valkommen In Jonko	112	2025-12-23 09:38:57.947191	\N	\N	\N
169	2025-10-25T00:00:00.000Z	Zoo.Se Uppsala	164	2025-12-23 09:39:04.014636	\N	\N	\N
170	2025-10-27T00:00:00.000Z	Ul Kollektivtr	158	2025-12-23 09:39:08.80179	\N	\N	\N
171	2025-11-22T00:00:00.000Z	Circle K Uppsala Rapsg	85	2025-12-23 09:39:20.735198	\N	\N	\N
172	2025-10-25T00:00:00.000Z	Max Burgers 2010069 Ec	166	2025-12-23 09:39:30.818672	\N	\N	\N
173	2025-10-24T00:00:00.000Z	Överföring	170	2025-12-23 09:39:41.805165	\N	\N	\N
174	2025-10-23T00:00:00.000Z	Max Burgers 2010053 Ec	176	2025-12-23 09:39:55.217704	\N	\N	\N
175	2025-10-24T00:00:00.000Z	Selecta Ab	169	2025-12-23 09:40:14.070259	\N	\N	\N
176	2025-10-22T00:00:00.000Z	Pressbyran 4308139	178	2025-12-23 09:40:23.954506	\N	\N	\N
177	2025-10-18T00:00:00.000Z	Mcduppsalafyrislund	186	2025-12-23 09:40:33.13291	\N	\N	\N
178	2025-10-13T00:00:00.000Z	Mcduppsalafyrislund	196	2025-12-23 09:40:50.102251	\N	\N	\N
179	2025-10-05T00:00:00.000Z	Xl Grillen	209	2025-12-23 09:41:05.822004	\N	\N	\N
180	2025-10-04T00:00:00.000Z	Pressbyran 4408657	212	2025-12-23 09:41:36.273908	\N	\N	\N
115	2025-10-30T00:00:00.000Z	Trängselskat	148	2025-12-23 00:12:10.689195	\N	\N	\N
181	2025-10-10T00:00:00.000Z	Easypark	203	2025-12-23 16:07:42.101132	\N	\N	\N
183	2025-11-26T00:00:00.000Z	Avgift Bankkort	67	2025-12-23 23:14:09.244151	\N	\N	\N
184	2025-11-26T00:00:00.000Z	Avgift Bankkort	66	2025-12-23 23:14:22.380082	\N	\N	\N
182	2025-12-03T00:00:00.000Z	Systembolaget	31	2025-12-23 23:13:52.709918	\N	\N	\N
121	2025-10-27T00:00:00.000Z	Agria	162	2025-12-23 00:13:29.304912	\N	\N	\N
95	2025-11-03T00:00:00.000Z	Emma olycksfall	133	2025-12-23 00:08:42.318102	\N	\N	\N
185	2025-12-07T00:00:00.000Z	Eddie Birgitta återbetalning	20	2025-12-23 23:18:25.651629	\N	\N	\N
186	2025-11-25T00:00:00.000Z	Överföring	69	2025-12-23 23:20:44.042098	\N	\N	\N
187	2025-11-25T00:00:00.000Z	Överföring	68	2025-12-23 23:21:03.55527	\N	\N	\N
188	2025-11-25T00:00:00.000Z	Överföring	70	2025-12-23 23:21:13.753291	\N	\N	\N
189	2025-11-23T00:00:00.000Z	Loopia Ab	78	2025-12-23 23:22:03.416233	\N	\N	\N
190	2025-11-24T00:00:00.000Z	Överföring Till Ica Banks Konto	77	2025-12-23 23:22:29.836296	\N	\N	\N
191	2025-11-22T00:00:00.000Z	Matts hyra verkstad	90	2025-12-23 23:23:32.015025	\N	\N	\N
192	2025-11-22T00:00:00.000Z	Matts hyra verkstad återbetalning	89	2025-12-23 23:23:52.163963	\N	\N	\N
193	2025-11-22T00:00:00.000Z	Domän	91	2025-12-23 23:24:55.376098	\N	\N	\N
194	2025-11-10T00:00:00.000Z	P-bot	111	2025-12-23 23:26:23.51644	\N	\N	\N
195	2025-11-09T00:00:00.000Z	P-bot	117	2025-12-23 23:26:34.70602	\N	\N	\N
196	2025-10-31T00:00:00.000Z	Lager 157 Uppsa	137	2025-12-23 23:27:20.679058	\N	\N	\N
197	2025-10-22T00:00:00.000Z	Lager 157 Uppsa	177	2025-12-23 23:27:33.06668	\N	\N	\N
198	2025-10-25T00:00:00.000Z	Lager 157 Uppsa	165	2025-12-23 23:27:41.924581	\N	\N	\N
199	2025-10-29T00:00:00.000Z	Kläder	150	2025-12-23 23:27:56.568913	\N	\N	\N
200	2025-10-21T00:00:00.000Z	Cafe Cups	179	2025-12-23 23:29:00.56525	\N	\N	\N
201	2025-10-19T00:00:00.000Z	Biltema Sweden Uppsala	183	2025-12-23 23:29:10.350783	\N	\N	\N
202	2025-10-18T00:00:00.000Z	Biltema Sweden Uppsala	187	2025-12-23 23:29:31.998216	\N	\N	\N
203	2025-10-16T00:00:00.000Z	Partykungen.Se	192	2025-12-23 23:29:42.013225	\N	\N	\N
204	2025-10-17T00:00:00.000Z	Adlibris.Se	190	2025-12-23 23:29:53.136152	\N	\N	\N
205	2025-10-18T00:00:00.000Z	Överföring Till Ica Banks Konto	188	2025-12-23 23:30:23.629317	\N	\N	\N
206	2025-10-08T00:00:00.000Z	Arsta Travcafe	206	2025-12-23 23:30:39.525194	\N	\N	\N
207	2025-10-10T00:00:00.000Z	Biltema Sweden Uppsala	200	2025-12-23 23:30:51.753358	\N	\N	\N
208	2025-12-23T00:00:00.000Z	Zoo.Se Uppsala         Uppsala        Se	214	2025-12-23 23:33:00.430182	\N	\N	\N
209	2025-12-23T00:00:00.000Z	Fäboden                Uppsala        Se	215	2025-12-23 23:33:09.336981	\N	\N	\N
210	2025-12-23T00:00:00.000Z	Maxi Ica Stormarknad Sten	216	2025-12-23 23:33:14.581352	\N	\N	\N
211	2025-12-23T00:00:00.000Z	Maxi Ica Stormarknad Sten	217	2025-12-23 23:33:21.276078	\N	\N	\N
212	2025-12-23T00:00:00.000Z	Återbet Buffert	218	2025-12-23 23:33:34.62406	\N	\N	\N
213	2025-10-03T00:00:00.000Z	Första insättning	213	2025-12-23 23:35:25.664162	\N	\N	\N
214	2025-10-15T00:00:00.000Z	Överföring	193	2025-12-23 23:36:42.979985	\N	\N	\N
215	2025-10-31T00:00:00.000Z	Köp via Viktors kort	139	2025-12-23 23:38:29.362457	\N	\N	\N
216	2025-11-11T00:00:00.000Z	Dyrkset	108	2025-12-23 23:39:22.296046	\N	\N	\N
217	2025-10-29T00:00:00.000Z	Ränteintäkter	\N	2025-12-23 23:45:18.841496	\N	\N	\N
218	2025-10-01T00:00:00.000Z	IB Semesterkassa	\N	2025-12-23 23:47:28.576579	\N	\N	\N
219	2025-10-05T00:00:00.000Z	Tackkort bröllop	210	2025-12-23 23:49:03.234119	\N	\N	\N
220	2025-10-24T00:00:00.000Z	Överföring	171	2025-12-23 23:51:54.470737	\N	\N	\N
221	2025-10-01T00:00:00.000Z	IB Buffert	\N	2025-12-24 00:00:58.02371	\N	\N	\N
125	2025-10-21T00:00:00.000Z	Maxi Ica Stormarknad Sten	181	2025-12-23 00:14:10.40898	\N	\N	\N
223	2025-12-25T00:00:00.000Z	Taxi Stockholm	447	2025-12-26 21:12:53.308165	\N	\N	\N
224	2025-12-26T00:00:00.000Z	Ica Supermarket Arstahall	444	2025-12-26 21:14:24.639377	\N	\N	\N
225	2025-12-26T00:00:00.000Z	Max Burgers 2010062_Ki Uppsala        Se	443	2025-12-26 21:14:36.162728	\N	\N	\N
226	2025-12-24T00:00:00.000Z	Okq8	448	2025-12-26 21:14:49.154387	\N	\N	\N
227	2025-12-25T00:00:00.000Z	Maxi Ica Stormarknad Gnis	446	2025-12-26 21:14:54.31916	\N	\N	\N
228	2025-12-25T00:00:00.000Z	Maxi Ica Stormarknad Gnis	445	2025-12-26 21:14:59.772547	\N	\N	\N
51	2025-11-27T00:00:00.000Z	Amortering	62	2025-12-22 23:04:41.17757	\N	\N	\N
229	2025-10-01T00:00:00.000Z	IB Bolån	\N	2025-12-29 13:58:08.467721	\N	\N	\N
230	2025-12-29T14:25:02.757Z	Resor utlägg	\N	2025-12-29 14:30:22.637359	\N	\N	\N
231	2025-12-29T14:30:29.369Z	Välgörenhet utlägg	\N	2025-12-29 14:30:48.759707	\N	\N	\N
232	2025-12-29T14:30:53.193Z	Facket utlägg	\N	2025-12-29 14:31:13.426715	\N	\N	\N
233	2025-12-29T14:31:14.726Z	Lunch utlägg	\N	2025-12-29 14:31:32.092549	\N	\N	\N
235	2025-12-29T14:32:23.673Z	Styrelsearvode	\N	2025-12-29 14:33:01.268209	\N	\N	\N
236	2025-12-29T14:33:07.412Z	Swish taxi	\N	2025-12-29 14:33:25.010038	\N	\N	\N
237	2025-12-29T14:34:29.235Z	Swish julklapp matberedare	\N	2025-12-29 14:35:01.013252	\N	\N	\N
238	2025-12-29T00:00:00.000Z	Avanza Bank	452	2025-12-29 14:58:13.500555	\N	\N	\N
239	2025-12-29T00:00:00.000Z	Wspa Sverige	453	2025-12-29 14:58:24.011217	\N	\N	\N
241	2025-12-29T00:00:00.000Z	Union.Akassa	455	2025-12-29 14:58:51.026724	\N	\N	\N
242	2025-12-29T00:00:00.000Z	Union.Akassa	456	2025-12-29 14:58:57.358904	\N	\N	\N
243	2025-12-29T00:00:00.000Z	Comviq.Se              Kista          Se	457	2025-12-29 14:59:20.537356	\N	\N	\N
244	2025-12-28T00:00:00.000Z	Loopia Ab	460	2025-12-29 14:59:44.189834	\N	\N	\N
246	2025-12-27T00:00:00.000Z	Månadspeng	464	2025-12-29 15:00:38.740784	\N	\N	\N
245	2025-12-27T00:00:00.000Z	Månadspeng	465	2025-12-29 15:00:15.305532	\N	\N	\N
247	2025-12-27T00:00:00.000Z	Månadspeng reservation	463	2025-12-29 15:16:53.168196	\N	\N	\N
248	2025-12-29T00:00:00.000Z	Avanza Bank	451	2025-12-29 15:17:01.161028	\N	\N	\N
249	2025-12-29T00:00:00.000Z	Avgift Bankkort	458	2025-12-29 15:17:08.175466	\N	\N	\N
250	2025-12-29T00:00:00.000Z	Avgift Bankkort	459	2025-12-29 15:17:12.582939	\N	\N	\N
251	2025-12-28T00:00:00.000Z	Ica Årstahallen	461	2025-12-29 15:17:17.539188	\N	\N	\N
252	2025-12-29T00:00:00.000Z	Överföring Till Ica Banks Konto	450	2025-12-29 15:17:39.940954	\N	\N	\N
253	2025-12-27T00:00:00.000Z	Överföring	462	2025-12-29 15:17:52.251565	\N	\N	\N
254	2025-12-29T00:00:00.000Z	Återbet skuld	449	2025-12-29 15:18:12.808006	\N	\N	\N
255	2025-12-29T15:18:50.497Z	Månadspeng	\N	2025-12-29 15:19:54.020685	\N	\N	\N
260	2026-01-01T00:00:00.000Z	Loopia Ab              Västerås       Se	488	2026-01-01 14:17:11.929811	\N	\N	\N
262	2025-12-30T00:00:00.000Z	Maxi Ica Stormarknad Gnis	491	2026-01-01 14:21:24.104798	\N	\N	\N
263	2025-12-30T00:00:00.000Z	Fastum Ubc	492	2026-01-01 14:43:01.230126	\N	\N	\N
264	2025-12-30T00:00:00.000Z	Sbab	498	2026-01-01 14:50:49.981417	\N	\N	\N
269	2025-12-30T00:00:00.000Z	Csn	494	2026-01-01 17:34:38.499514	\N	\N	\N
270	2025-12-30T00:00:00.000Z	Ica Försäkr	495	2026-01-01 17:34:51.783123	\N	\N	\N
271	2025-12-30T00:00:00.000Z	Systembolaget	490	2026-01-01 17:34:58.993844	\N	\N	\N
272	2025-12-30T00:00:00.000Z	Unionen	496	2026-01-01 17:35:06.862644	\N	\N	\N
273	2026-01-01T17:46:25.048Z	Sparränta	\N	2026-01-01 17:47:48.804902	\N	\N	\N
275	2026-01-01T17:48:55.967Z	Sparränta	\N	2026-01-01 17:49:42.497729	\N	\N	\N
274	2026-01-01T17:47:50.816Z	Sparränta	\N	2026-01-01 17:48:52.059027	\N	\N	\N
276	2026-01-01T18:00:58.777Z	Sparränta	\N	2026-01-01 18:02:06.859687	\N	\N	\N
261	2025-12-31T00:00:00.000Z	Erhållen Ränta	489	2026-01-01 14:21:17.058925	\N	\N	\N
240	2025-12-29T00:00:00.000Z	Agria	454	2025-12-29 14:58:38.132292	\N	\N	\N
234	2025-12-29T14:31:36.713Z	Veterinärkostnader utlägg	\N	2025-12-29 14:32:00.077665	\N	\N	\N
222	2025-10-01T00:00:00.000Z	IB Kontantinsats	\N	2025-12-24 00:01:43.518026	\N	\N	\N
343	2026-01-25T00:00:00.000Z	Månadspeng	551	2026-01-26 08:46:09.35523	\N	\N	\N
344	2026-01-26T00:00:00.000Z	Avgift Bankkort	550	2026-01-26 08:46:14.583639	\N	\N	\N
345	2026-01-26T00:00:00.000Z	Avgift Bankkort	549	2026-01-26 08:46:18.296365	\N	\N	\N
346	2026-01-26T00:00:00.000Z	Överföring	546	2026-01-26 08:46:22.426195	\N	\N	\N
277	2026-01-01T18:43:10.908Z	Flytta överskott från buffert	\N	2026-01-01 18:43:49.250808	\N	\N	\N
286	2025-10-01T00:00:00.000Z	IB Pension	\N	2026-01-01 22:36:32.026595	\N	\N	\N
287	2025-11-30T00:00:00.000Z	Upplupen bolåneränta	\N	2026-01-01 23:59:21.498175	\N	\N	\N
288	2025-11-30T00:00:00.000Z	Upplupen bolåneränta	\N	2026-01-01 23:59:50.578472	\N	\N	\N
347	2026-01-26T00:00:00.000Z	Avanza Bank	548	2026-01-26 08:46:31.207527	\N	\N	\N
283	2025-12-30T00:00:00.000Z	Sbab	493	2026-01-01 20:34:01.324375	\N	\N	\N
278	2025-12-30T00:00:00.000Z	Sbab	497	2026-01-01 20:19:32.151273	\N	\N	\N
348	2026-01-26T00:00:00.000Z	Avanza Bank	547	2026-01-26 08:46:40.932945	\N	\N	\N
86	2025-11-27T00:00:00.000Z	Viktor olycksfall	61	2025-12-23 00:02:51.140031	\N	\N	\N
289	2026-01-02T00:00:00.000Z	Spotify P3e08a5a81	502	2026-01-07 00:44:50.907067	\N	\N	\N
290	2026-01-02T00:00:00.000Z	Lf Uppsala	503	2026-01-07 00:45:18.436364	\N	\N	\N
291	2026-01-02T00:00:00.000Z	Lf Uppsala	505	2026-01-07 00:45:33.662366	\N	\N	\N
292	2026-01-02T00:00:00.000Z	Folktandvård	506	2026-01-07 00:45:57.211499	\N	\N	\N
294	2026-01-05T00:00:00.000Z	Ica Supermarket Arstahall	500	2026-01-07 00:46:25.025522	\N	\N	\N
295	2026-01-07T00:00:00.000Z	Apotea	499	2026-01-07 00:46:35.214784	\N	\N	\N
296	2026-01-04T00:00:00.000Z	Max	501	2026-01-07 00:46:46.232134	\N	\N	\N
298	2025-12-31T00:00:00.000Z	Sparränta	\N	2026-01-11 12:09:45.038902	\N	\N	\N
300	2026-01-10T00:00:00.000Z	Ica Supermarket Arstahall	508	2026-01-11 12:11:54.899404	\N	\N	\N
301	2026-01-08T00:00:00.000Z	Ica Årstahallen	509	2026-01-11 12:11:58.26488	\N	\N	\N
304	2026-01-11T00:00:00.000Z	Öronmärkt till matberedare	507	2026-01-11 12:33:24.265401	\N	\N	\N
306	2026-01-19T00:00:00.000Z	Maxi Ica Stormarknad Sten	510	2026-01-19 22:35:22.405514	\N	\N	\N
307	2026-01-18T00:00:00.000Z	Maxi Ica Storm Gnist	512	2026-01-19 22:35:28.72553	\N	\N	\N
308	2026-01-18T00:00:00.000Z	Maxi Ica Storm Gnist	511	2026-01-19 22:35:34.715981	\N	\N	\N
309	2026-01-17T00:00:00.000Z	Rusta - 7 Uppsala Bola	514	2026-01-19 22:36:56.312912	\N	\N	\N
310	2026-01-17T00:00:00.000Z	Gåva till Vequist	516	2026-01-19 22:37:17.566338	\N	\N	\N
311	2026-01-17T00:00:00.000Z	Dollarstore Uppsala	517	2026-01-19 22:37:24.00353	\N	\N	\N
312	2026-01-17T00:00:00.000Z	Ikea Uppsala Hfb Eco	515	2026-01-19 22:38:03.201719	\N	\N	\N
313	2026-01-16T00:00:00.000Z	Ica Årstahallen	519	2026-01-19 22:38:08.345209	\N	\N	\N
314	2026-01-15T00:00:00.000Z	Hemkop Uppsala Svava	520	2026-01-19 22:38:14.729096	\N	\N	\N
315	2026-01-14T00:00:00.000Z	Ica Årstahallen	522	2026-01-19 22:38:18.22158	\N	\N	\N
316	2026-01-14T00:00:00.000Z	Ica Årstahallen	521	2026-01-19 22:38:22.368083	\N	\N	\N
317	2026-01-13T00:00:00.000Z	Hemkop Uppsala Svava	523	2026-01-19 22:38:31.175531	\N	\N	\N
318	2026-01-12T00:00:00.000Z	Netflix.Com	526	2026-01-19 22:38:36.600143	\N	\N	\N
319	2026-01-11T00:00:00.000Z	Ikea Barkarby If Custo	527	2026-01-19 22:38:43.581792	\N	\N	\N
320	2026-01-11T00:00:00.000Z	Maxi Ica Storm Gnist	529	2026-01-19 22:38:49.358513	\N	\N	\N
321	2026-01-18T00:00:00.000Z	Uttag buffert	513	2026-01-19 22:39:03.037805	\N	\N	\N
322	2026-01-17T00:00:00.000Z	Uttag buffert	518	2026-01-19 22:39:07.879729	\N	\N	\N
323	2026-01-13T00:00:00.000Z	Uttag buffert	524	2026-01-19 22:39:14.631112	\N	\N	\N
324	2026-01-11T00:00:00.000Z	Överföring Till Ica Banks Konto	530	2026-01-19 22:40:20.626254	\N	\N	\N
325	2026-01-13T00:00:00.000Z	Överföring	525	2026-01-19 22:44:05.130508	\N	\N	\N
326	2026-01-11T00:00:00.000Z	Ikea Barkarby Hfb Eco	528	2026-01-19 22:45:14.666271	\N	\N	\N
327	2026-01-19T22:46:02.773Z	Utlägg resor t o m 19/1	\N	2026-01-19 22:46:25.267087	\N	\N	\N
328	2026-01-23T00:00:00.000Z	Lön Emma	532	2026-01-23 09:45:09.11066	\N	\N	\N
329	2026-01-23T00:00:00.000Z	Lön Viktor	531	2026-01-23 09:45:16.86171	\N	\N	\N
330	2026-01-22T00:00:00.000Z	Easypark               Easypark.Se    Se	535	2026-01-23 09:45:23.595589	\N	\N	\N
331	2026-01-22T00:00:00.000Z	Uttag buffert	534	2026-01-23 09:45:31.409602	\N	\N	\N
332	2026-01-22T00:00:00.000Z	Maxi Ica Storm Gnist	533	2026-01-23 09:45:36.433065	\N	\N	\N
333	2026-01-21T00:00:00.000Z	Hemkop Uppsala Svava	536	2026-01-23 09:45:41.119356	\N	\N	\N
334	2026-01-20T00:00:00.000Z	Cherry Konfektyr	537	2026-01-23 09:45:47.007797	\N	\N	\N
335	2025-12-31T00:00:00.000Z	Reservation bilskatt	\N	2026-01-23 10:19:16.154316	\N	\N	\N
349	2026-01-26T00:00:00.000Z	Återbet utlägg	545	2026-01-26 08:47:00.195809	\N	\N	\N
336	2026-01-01T00:00:00.000Z	Bilskatt	\N	2026-01-23 10:19:54.384174	\N	\N	\N
337	2026-01-26T08:35:28.433Z	Emma utlägg	\N	2026-01-26 08:37:20.810803	\N	\N	\N
338	2026-01-26T08:38:22.779Z	Utlägg middag	\N	2026-01-26 08:38:26.918512	\N	\N	\N
339	2026-01-23T00:00:00.000Z	Återbet buffert	556	2026-01-26 08:45:24.739459	\N	\N	\N
340	2026-01-23T00:00:00.000Z	Ica Årstahallen	554	2026-01-26 08:45:34.45417	\N	\N	\N
341	2026-01-25T00:00:00.000Z	Överföring	552	2026-01-26 08:45:41.843413	\N	\N	\N
342	2026-01-25T00:00:00.000Z	Pressbyran 4308650     Uppsala        Se	553	2026-01-26 08:45:48.914867	\N	\N	\N
350	2026-01-23T00:00:00.000Z	Uppbokning bilskatt	555	2026-01-26 08:47:56.076311	\N	\N	\N
351	2026-02-03T00:00:00.000Z	Maxi Ica Storm Gnist	559	2026-02-04 16:07:23.525275	\N	\N	\N
352	2026-02-02T00:00:00.000Z	Lf Uppsala	564	2026-02-04 16:07:35.53599	\N	\N	\N
353	2026-02-02T00:00:00.000Z	Emma olycksfall	566	2026-02-04 16:07:48.145759	\N	\N	\N
354	2026-02-02T00:00:00.000Z	Folktandvård	565	2026-02-04 16:09:31.667158	\N	\N	\N
355	2026-02-02T00:00:00.000Z	Ica Årstahallen	561	2026-02-04 16:09:36.742972	\N	\N	\N
356	2026-02-02T00:00:00.000Z	Spotify P3ef8be999	560	2026-02-04 16:09:42.322069	\N	\N	\N
357	2026-02-02T00:00:00.000Z	Ica Årstahallen	562	2026-02-04 16:09:46.618527	\N	\N	\N
358	2026-02-01T00:00:00.000Z	Loopia Ab	567	2026-02-04 16:09:51.477542	\N	\N	\N
359	2026-01-30T00:00:00.000Z	Sbab	578	2026-02-04 16:10:00.928378	\N	\N	\N
360	2026-01-30T00:00:00.000Z	Trängselskat	575	2026-02-04 16:10:07.465302	\N	\N	\N
361	2026-01-30T00:00:00.000Z	Csn	576	2026-02-04 16:10:23.759029	\N	\N	\N
362	2026-01-31T00:00:00.000Z	Ica Årstahallen	568	2026-02-04 16:10:28.653075	\N	\N	\N
363	2026-01-30T00:00:00.000Z	Fastum Ubc	571	2026-02-04 16:10:41.457317	\N	\N	\N
364	2026-01-30T00:00:00.000Z	Ica Årstahallen	569	2026-02-04 16:10:45.554354	\N	\N	\N
365	2026-01-29T00:00:00.000Z	Ica Årstahallen	579	2026-02-04 16:10:52.030318	\N	\N	\N
366	2026-01-29T00:00:00.000Z	Djurens Rätt	580	2026-02-04 16:10:59.16579	\N	\N	\N
367	2026-01-28T00:00:00.000Z	Union.Akassa	584	2026-02-04 16:11:07.420275	\N	\N	\N
368	2026-01-30T00:00:00.000Z	Unionen	577	2026-02-04 16:11:12.349736	\N	\N	\N
369	2026-01-30T00:00:00.000Z	Unionen	574	2026-02-04 16:11:18.060212	\N	\N	\N
370	2026-01-28T00:00:00.000Z	Union.Akassa	585	2026-02-04 16:11:22.062696	\N	\N	\N
371	2026-01-28T00:00:00.000Z	Hemkop Uppsala Svava	582	2026-02-04 16:11:27.884412	\N	\N	\N
372	2026-01-28T00:00:00.000Z	Ica Försäkr	583	2026-02-04 16:11:35.16716	\N	\N	\N
373	2026-01-28T00:00:00.000Z	Comviq.Se	581	2026-02-04 16:11:43.977294	\N	\N	\N
374	2026-01-27T00:00:00.000Z	Max Burgers 2010053 Ki	586	2026-02-04 16:11:48.789714	\N	\N	\N
375	2026-01-27T00:00:00.000Z	Agria	589	2026-02-04 16:11:58.572703	\N	\N	\N
376	2026-01-27T00:00:00.000Z	Hemkop Uppsala Svava	587	2026-02-04 16:12:03.283317	\N	\N	\N
377	2026-01-27T00:00:00.000Z	Coop Stationsgallerian	588	2026-02-04 16:12:12.294852	\N	\N	\N
378	2026-01-30T00:00:00.000Z	Csn	572	2026-02-04 16:12:23.413091	\N	\N	\N
379	2026-01-30T00:00:00.000Z	Sbab	573	2026-02-04 16:12:32.343686	\N	\N	\N
380	2026-02-02T00:00:00.000Z	Vattenfall	563	2026-02-04 16:12:52.010882	\N	\N	\N
293	2026-01-02T00:00:00.000Z	Vattenfall	504	2026-01-07 00:46:15.25839	\N	\N	\N
381	2026-01-30T00:00:00.000Z	Överföring	570	2026-02-04 16:14:33.519411	\N	\N	\N
382	2026-02-15T00:00:00.000Z	Fjallnora Frilu	590	2026-02-16 13:53:24.378039	\N	\N	\N
383	2026-02-13T00:00:00.000Z	Ica Årstahallen	596	2026-02-16 13:53:28.666518	\N	\N	\N
384	2026-02-14T00:00:00.000Z	Maxi Ica Storm Gnist	594	2026-02-16 13:53:31.884341	\N	\N	\N
385	2026-02-13T00:00:00.000Z	Hemkop Uppsala Svava	595	2026-02-16 13:53:37.39247	\N	\N	\N
386	2026-02-12T00:00:00.000Z	Easypark	599	2026-02-16 13:53:47.709639	\N	\N	\N
387	2026-02-12T00:00:00.000Z	Netflix.Com	598	2026-02-16 13:53:52.934364	\N	\N	\N
388	2026-02-11T00:00:00.000Z	Hemkop Uppsala Svava	600	2026-02-16 13:53:56.89123	\N	\N	\N
389	2026-02-14T00:00:00.000Z	Easypark	593	2026-02-16 13:54:01.377209	\N	\N	\N
390	2026-02-15T00:00:00.000Z	Preem Uppsala Kumlag.	591	2026-02-16 13:54:06.545232	\N	\N	\N
391	2026-02-15T00:00:00.000Z	Biltvätt	592	2026-02-16 13:54:15.086745	\N	\N	\N
392	2026-02-06T00:00:00.000Z	Mcdbolanderna	605	2026-02-16 13:54:23.379499	\N	\N	\N
393	2026-02-06T00:00:00.000Z	Maxi Ica Storm Gnist	606	2026-02-16 13:54:27.253012	\N	\N	\N
394	2026-02-07T00:00:00.000Z	Maxi Ica Storm Gnist	604	2026-02-16 13:54:31.052791	\N	\N	\N
395	2026-02-09T00:00:00.000Z	Ica Årstahallen	602	2026-02-16 13:54:34.69995	\N	\N	\N
396	2026-02-08T00:00:00.000Z	Maxi Ica Storm Gnist	603	2026-02-16 13:54:38.154967	\N	\N	\N
397	2026-02-06T00:00:00.000Z	Maxi Ica Storm Gnist	607	2026-02-16 13:54:42.035802	\N	\N	\N
398	2026-02-05T00:00:00.000Z	Ica Årstahallen	608	2026-02-16 13:54:45.498107	\N	\N	\N
399	2026-02-11T00:00:00.000Z	Torgkassen Ab	601	2026-02-16 13:54:50.215293	\N	\N	\N
400	2026-02-12T00:00:00.000Z	Arsta Travcafe	597	2026-02-16 13:54:54.477343	\N	\N	\N
401	2026-02-04T00:00:00.000Z	Okq8 Uppsala Valsatra  Uppsala        Se	557	2026-02-16 13:54:59.192955	\N	\N	\N
402	2026-02-03T00:00:00.000Z	Rusta - 7 Uppsala Bola	558	2026-02-16 13:56:31.875445	\N	\N	\N
403	2026-03-04T00:00:00.000Z	Periodisering månadspeng	609	2026-03-04 11:57:17.531633	\N	\N	\N
404	2026-02-28T00:00:00.000Z	Månadspeng	\N	2026-03-04 11:57:52.924727	\N	\N	\N
405	2026-03-03T00:00:00.000Z	Baras Gø Mstø Lle      Uppsala        Se	613	2026-03-04 14:34:44.059313	\N	\N	\N
406	2026-03-03T00:00:00.000Z	Buggkurs	614	2026-03-04 14:35:03.286072	\N	\N	\N
407	2026-03-04T00:00:00.000Z	Easypark               Easypark.Se    Se	610	2026-03-04 14:35:09.922852	\N	\N	\N
408	2026-03-03T00:00:00.000Z	Easypark	616	2026-03-04 14:35:13.848307	\N	\N	\N
409	2026-03-03T00:00:00.000Z	Max Burgers 2010053_Ki Uppsala        Se	612	2026-03-04 14:35:23.362214	\N	\N	\N
410	2026-03-02T00:00:00.000Z	Djurens Rätt	619	2026-03-04 14:35:29.759494	\N	\N	\N
411	2026-03-02T00:00:00.000Z	Spotify P3ff105e87	618	2026-03-04 14:35:34.121593	\N	\N	\N
416	2026-03-02T00:00:00.000Z	Lf Uppsala	623	2026-03-04 14:36:33.467297	\N	\N	\N
417	2026-03-02T00:00:00.000Z	Lf Uppsala	625	2026-03-04 14:36:42.140919	\N	\N	\N
418	2026-02-27T00:00:00.000Z	Mobil + abonnemang	630	2026-03-04 14:36:55.467575	\N	\N	\N
419	2026-02-27T00:00:00.000Z	Csn	634	2026-03-04 14:37:10.844856	\N	\N	\N
420	2026-02-27T00:00:00.000Z	Csn	632	2026-03-04 14:37:17.375554	\N	\N	\N
421	2026-02-27T00:00:00.000Z	Ica Årstahallen	631	2026-03-04 14:37:24.782336	\N	\N	\N
422	2026-02-27T00:00:00.000Z	Unionen	638	2026-03-04 14:37:33.491676	\N	\N	\N
424	2026-02-27T00:00:00.000Z	Fastum Ubc	633	2026-03-04 14:38:24.673246	\N	\N	\N
425	2026-02-27T00:00:00.000Z	Unionen	637	2026-03-04 14:38:30.521102	\N	\N	\N
426	2026-02-26T00:00:00.000Z	Maxi Ica Storm Gnist	639	2026-03-04 14:38:40.656367	\N	\N	\N
427	2026-02-26T00:00:00.000Z	Avgift Bankkort	641	2026-03-04 14:38:44.911539	\N	\N	\N
428	2026-02-26T00:00:00.000Z	Avgift Bankkort	642	2026-03-04 14:38:48.543049	\N	\N	\N
429	2026-02-25T00:00:00.000Z	I00000382696	645	2026-03-04 14:38:54.813899	\N	\N	\N
430	2026-02-25T00:00:00.000Z	I00000382657	646	2026-03-04 14:39:03.688616	\N	\N	\N
431	2026-02-24T00:00:00.000Z	Faboden	647	2026-03-04 14:39:08.627144	\N	\N	\N
432	2026-02-25T00:00:00.000Z	Avanza Bank	643	2026-03-04 14:39:15.904567	\N	\N	\N
433	2026-02-25T00:00:00.000Z	Avanza Bank	644	2026-03-04 14:39:28.725833	\N	\N	\N
434	2026-02-24T00:00:00.000Z	Mcduppsalafyrislund	648	2026-03-04 14:39:32.906874	\N	\N	\N
435	2026-02-23T00:00:00.000Z	Ica Årstahallen	650	2026-03-04 14:39:37.426562	\N	\N	\N
436	2026-02-20T00:00:00.000Z	Torgkassen Ab	652	2026-03-04 14:39:43.456937	\N	\N	\N
437	2026-02-19T00:00:00.000Z	Easypark	654	2026-03-04 14:39:49.902356	\N	\N	\N
438	2026-02-19T00:00:00.000Z	Preem Vagnharad	653	2026-03-04 14:39:54.575076	\N	\N	\N
439	2026-02-18T00:00:00.000Z	Hemkop Uppsala Svava	655	2026-03-04 14:40:00.135095	\N	\N	\N
440	2026-02-18T00:00:00.000Z	Restaurang Capri	656	2026-03-04 14:40:05.440393	\N	\N	\N
441	2026-02-17T00:00:00.000Z	Ica Årstahallen	658	2026-03-04 14:40:11.076679	\N	\N	\N
442	2026-02-17T00:00:00.000Z	Easypark	659	2026-03-04 14:40:15.209786	\N	\N	\N
443	2026-02-17T00:00:00.000Z	Maxi Ica Storm Gnist	657	2026-03-04 14:40:20.834804	\N	\N	\N
444	2026-02-20T00:00:00.000Z	Systembolaget	651	2026-03-04 14:40:30.259669	\N	\N	\N
445	2026-02-16T00:00:00.000Z	Intern överföring	660	2026-03-04 14:41:06.474598	\N	\N	\N
446	2026-02-16T00:00:00.000Z	Betalning bilskatt	661	2026-03-04 14:41:45.115749	\N	\N	\N
447	2026-02-27T00:00:00.000Z	Ica Försäkr	635	2026-03-04 14:42:20.416415	\N	\N	\N
448	2026-02-28T00:00:00.000Z	Ica Årstahallen	629	2026-03-04 14:42:24.934671	\N	\N	\N
449	2026-02-28T00:00:00.000Z	Easypark	628	2026-03-04 14:42:30.611499	\N	\N	\N
450	2026-02-26T00:00:00.000Z	Easypark	640	2026-03-04 14:42:34.816775	\N	\N	\N
451	2026-02-24T00:00:00.000Z	Easypark	649	2026-03-04 14:42:39.318983	\N	\N	\N
452	2026-03-01T00:00:00.000Z	Loopia Ab	627	2026-03-04 14:42:44.579033	\N	\N	\N
453	2026-03-03T00:00:00.000Z	Vattenfall	617	2026-03-04 14:43:25.751362	\N	\N	\N
454	2026-02-27T00:00:00.000Z	Agria	636	2026-03-04 14:43:40.598417	\N	\N	\N
455	2026-03-03T00:00:00.000Z	Erikshjalpen Up        Goteborg       Se	615	2026-03-04 14:43:46.302813	\N	\N	\N
456	2026-02-28T00:00:00.000Z	Bilskatt	\N	2026-03-04 14:44:38.729568	\N	\N	\N
423	2026-03-02T00:00:00.000Z	Folktandvård	626	2026-03-04 14:38:15.405501	\N	\N	\N
457	2026-02-28T00:00:00.000Z	Periodisering bolåneamortering	\N	2026-03-04 14:50:56.097228	\N	\N	\N
458	2026-02-28T00:00:00.000Z	Periodisering bolåneränta	\N	2026-03-04 14:52:03.456616	\N	\N	\N
459	2026-02-28T00:00:00.000Z	Periodisering bolåneränta	\N	2026-03-04 14:52:26.944993	\N	\N	\N
413	2026-03-02T00:00:00.000Z	Sbab	622	2026-03-04 14:35:49.97845	\N	\N	\N
412	2026-03-02T00:00:00.000Z	Sbab	620	2026-03-04 14:35:42.330363	\N	\N	\N
460	2026-02-28T00:00:00.000Z	Periodisering facket	\N	2026-03-04 14:53:47.064105	\N	\N	\N
461	2026-02-28T00:00:00.000Z	Periodisering facket	\N	2026-03-04 14:54:00.27106	\N	\N	\N
415	2026-03-02T00:00:00.000Z	Union.Akassa	624	2026-03-04 14:36:09.863369	\N	\N	\N
414	2026-03-02T00:00:00.000Z	Union.Akassa	621	2026-03-04 14:36:00.892739	\N	\N	\N
462	2026-03-28T00:00:00.000Z	Stora Coop Bolanderna  Uppsala        Se	662	2026-03-30 16:59:54.559581	\N	\N	\N
463	2026-03-28T00:00:00.000Z	Clas Ohlson 305        Uppsala        Se	663	2026-03-30 17:00:05.975418	\N	\N	\N
464	2026-03-28T00:00:00.000Z	Jula Sverige Ab 405    Uppsala        Se	664	2026-03-30 17:01:59.957368	\N	\N	\N
465	2026-03-28T00:00:00.000Z	Rusta - 7 Uppsala Bolø Uppsala        Se	665	2026-03-30 17:02:07.877265	\N	\N	\N
466	2026-03-28T00:00:00.000Z	Rusta - 7 Uppsala Bolø Uppsala Se	666	2026-03-30 17:02:12.967206	\N	\N	\N
468	2026-03-27T00:00:00.000Z	Ica Försäkr	671	2026-03-30 17:02:44.085929	\N	\N	\N
469	2026-03-27T00:00:00.000Z	Agria	672	2026-03-30 17:02:53.205475	\N	\N	\N
470	2026-03-27T00:00:00.000Z	Ica Gribbylund	668	2026-03-30 17:02:57.362734	\N	\N	\N
471	2026-03-27T00:00:00.000Z	Comviq.Se              Kista          Se	669	2026-03-30 17:03:01.015594	\N	\N	\N
472	2026-03-26T00:00:00.000Z	Okq8	673	2026-03-30 17:03:04.206958	\N	\N	\N
473	2026-03-26T00:00:00.000Z	Hemkop Uppsala Svava	674	2026-03-30 17:03:09.278465	\N	\N	\N
474	2026-03-26T00:00:00.000Z	Maxi Ica Storm Gnist	675	2026-03-30 17:03:12.668713	\N	\N	\N
475	2026-03-26T00:00:00.000Z	Överföring	676	2026-03-30 17:03:28.921428	\N	\N	\N
476	2026-03-26T00:00:00.000Z	Avgift Bankkort	679	2026-03-30 17:03:32.885558	\N	\N	\N
477	2026-03-26T00:00:00.000Z	Avgift Bankkort	678	2026-03-30 17:03:37.770963	\N	\N	\N
478	2026-03-25T00:00:00.000Z	Avanza Bank	683	2026-03-30 17:03:42.806363	\N	\N	\N
479	2026-03-25T00:00:00.000Z	Avanza Bank	682	2026-03-30 17:03:46.977298	\N	\N	\N
480	2026-03-25T00:00:00.000Z	I00000386359	684	2026-03-30 17:03:56.820806	\N	\N	\N
481	2026-03-22T00:00:00.000Z	Fullero Handel	686	2026-03-30 17:04:02.130246	\N	\N	\N
482	2026-03-24T00:00:00.000Z	Rusta - 7 Uppsala Bola	685	2026-03-30 17:04:05.773219	\N	\N	\N
483	2026-03-25T00:00:00.000Z	Hemkop Uppsala Svava	680	2026-03-30 17:04:09.290326	\N	\N	\N
484	2026-03-22T00:00:00.000Z	Ica Årstahallen	688	2026-03-30 17:04:14.570259	\N	\N	\N
485	2026-03-21T00:00:00.000Z	Ica Årstahallen	690	2026-03-30 17:04:18.261645	\N	\N	\N
486	2026-03-21T00:00:00.000Z	Willys Uppsala Bjork	689	2026-03-30 17:04:22.093452	\N	\N	\N
487	2026-03-20T00:00:00.000Z	Ul  Region Uppsala	692	2026-03-30 17:04:35.30222	\N	\N	\N
488	2026-03-20T00:00:00.000Z	Uds Smadjur	693	2026-03-30 17:04:45.759452	\N	\N	\N
489	2026-03-19T00:00:00.000Z	Ica Årstahallen	695	2026-03-30 17:04:49.132456	\N	\N	\N
490	2026-03-17T00:00:00.000Z	Ul  Region Uppsala	699	2026-03-30 17:04:59.365429	\N	\N	\N
491	2026-03-17T00:00:00.000Z	Ul  Region Uppsala	698	2026-03-30 17:05:03.428058	\N	\N	\N
492	2026-03-17T00:00:00.000Z	Easypark	700	2026-03-30 17:05:07.646258	\N	\N	\N
493	2026-03-15T00:00:00.000Z	Maxi Ica Storm Gnist	707	2026-03-30 17:05:25.913384	\N	\N	\N
494	2026-03-13T00:00:00.000Z	Willys Uppsala Bjork	710	2026-03-30 17:05:29.098922	\N	\N	\N
495	2026-03-14T00:00:00.000Z	Rusta - 7 Uppsala Bola	708	2026-03-30 17:05:36.881956	\N	\N	\N
496	2026-03-12T00:00:00.000Z	Netflix.Com	714	2026-03-30 17:05:41.53278	\N	\N	\N
497	2026-03-11T00:00:00.000Z	Ammortering	715	2026-03-30 17:05:49.322687	\N	\N	\N
498	2026-03-10T00:00:00.000Z	Easypark	716	2026-03-30 17:05:53.795489	\N	\N	\N
499	2026-03-09T00:00:00.000Z	Maxi Ica Storm Gnist	718	2026-03-30 17:05:57.554122	\N	\N	\N
500	2026-03-07T00:00:00.000Z	Maxi Ica Storm Gnist	723	2026-03-30 17:06:01.089965	\N	\N	\N
501	2026-03-07T00:00:00.000Z	Citysallad I Uppsala	720	2026-03-30 17:06:44.109899	\N	\N	\N
502	2026-03-12T00:00:00.000Z	Easypark	713	2026-03-30 17:06:50.047611	\N	\N	\N
503	2026-03-07T00:00:00.000Z	Easypark	722	2026-03-30 17:06:56.825125	\N	\N	\N
504	2026-03-05T00:00:00.000Z	Easypark	724	2026-03-30 17:06:59.97191	\N	\N	\N
505	2026-03-07T00:00:00.000Z	Ahlens Outlet Uppsala	721	2026-03-30 17:07:13.261289	\N	\N	\N
506	2026-03-16T00:00:00.000Z	Ul  Region Uppsala	701	2026-03-30 17:07:29.088096	\N	\N	\N
507	2026-03-18T00:00:00.000Z	Katalin And All That J	696	2026-03-30 17:07:41.133169	\N	\N	\N
508	2026-03-18T00:00:00.000Z	Återbetalning lån	697	2026-03-30 17:07:54.50184	\N	\N	\N
509	2026-03-20T00:00:00.000Z	Hemkop Uppsala Svava	691	2026-03-30 17:08:03.422086	\N	\N	\N
510	2026-03-27T00:00:00.000Z	Ellos Ab               Boras          Se	667	2026-03-30 17:08:14.671127	\N	\N	\N
511	2026-03-26T00:00:00.000Z	Överföring	677	2026-03-30 17:08:29.403209	\N	\N	\N
512	2026-03-20T00:00:00.000Z	Maxi Ica Storm Gnist	694	2026-03-30 17:08:34.209023	\N	\N	\N
513	2026-03-15T00:00:00.000Z	Plantagen Uppsa	705	2026-03-30 17:08:42.772972	\N	\N	\N
514	2026-07-02T00:00:00.000Z	Spotify P442b2bd0c     Stockholm      Se	725	2026-07-02 21:10:55.512979	\N	\N	\N
515	2026-07-01T00:00:00.000Z	Maxi Ica Storm Gnist	727	2026-07-02 21:11:01.53975	\N	\N	\N
516	2026-03-08T00:00:00.000Z	Baras Backe	719	2026-07-02 21:11:28.745013	\N	\N	\N
517	2026-03-13T00:00:00.000Z	W Meds.Se	709	2026-07-02 21:11:42.131329	\N	\N	\N
518	2026-03-16T00:00:00.000Z	Hemmakvall Upps	704	2026-07-02 21:11:57.148941	\N	\N	\N
519	2026-03-22T00:00:00.000Z	Max Burgers 2010069 Ec	687	2026-07-02 21:12:06.360738	\N	\N	\N
520	2026-03-25T00:00:00.000Z	Max Burgers 2010053 Ki	681	2026-07-02 21:12:10.460473	\N	\N	\N
521	2026-03-29T00:00:00.000Z	Ikea Barkarby Hfb Eco	1049	2026-07-02 21:12:18.715735	\N	\N	\N
522	2026-03-29T00:00:00.000Z	Max Burgers 2010077 Ki	1051	2026-07-02 21:12:25.3445	\N	\N	\N
523	2026-03-30T00:00:00.000Z	Sbab	1044	2026-07-02 21:12:49.653125	\N	\N	\N
524	2026-03-30T00:00:00.000Z	Sbab	1046	2026-07-02 21:12:56.930537	\N	\N	\N
525	2026-03-30T00:00:00.000Z	Union.Akassa	1047	2026-07-02 21:13:10.55324	\N	\N	\N
526	2026-03-30T00:00:00.000Z	Union.Akassa	1045	2026-07-02 21:13:18.960671	\N	\N	\N
527	2026-03-31T00:00:00.000Z	Fastum Ubc	1036	2026-07-02 21:13:30.185906	\N	\N	\N
467	2026-03-27T00:00:00.000Z	A-Kassa	670	2026-03-30 17:02:26.192612	\N	\N	\N
528	2026-06-05T00:00:00.000Z	Sl	819	2026-07-02 21:14:43.112493	\N	\N	\N
529	2026-06-03T00:00:00.000Z	Maxi Ica Storm Gnist	822	2026-07-02 21:14:52.992003	\N	\N	\N
530	2026-06-03T00:00:00.000Z	Maxi Ica Storm Gnist	823	2026-07-02 21:14:57.74738	\N	\N	\N
531	2026-06-02T00:00:00.000Z	Maxi Ica Storm Gnist	825	2026-07-02 21:15:03.212517	\N	\N	\N
532	2026-06-01T00:00:00.000Z	Mcdonalds 75200316	827	2026-07-02 21:15:07.450697	\N	\N	\N
533	2026-06-01T00:00:00.000Z	Månadspeng	828	2026-07-02 21:15:36.828099	\N	\N	\N
534	2026-06-02T00:00:00.000Z	Spotify P4318f5404	824	2026-07-02 21:15:46.505273	\N	\N	\N
535	2026-05-31T00:00:00.000Z	Lyssnaangen	837	2026-07-02 21:15:58.309041	\N	\N	\N
536	2026-05-30T00:00:00.000Z	Maxi Ica Storm Gnist	839	2026-07-02 21:16:03.746934	\N	\N	\N
537	2026-05-29T00:00:00.000Z	Csn	847	2026-07-02 21:16:19.14702	\N	\N	\N
538	2026-05-29T00:00:00.000Z	Csn	848	2026-07-02 21:16:26.820579	\N	\N	\N
539	2026-05-29T00:00:00.000Z	Unionen	849	2026-07-02 21:16:34.707049	\N	\N	\N
540	2026-05-29T00:00:00.000Z	Unionen	850	2026-07-02 21:16:39.48056	\N	\N	\N
541	2026-05-29T00:00:00.000Z	Fastum Ubc	846	2026-07-02 21:16:55.177967	\N	\N	\N
542	2026-05-29T00:00:00.000Z	Citysallad I Uppsala	840	2026-07-02 21:17:05.058776	\N	\N	\N
543	2026-05-28T00:00:00.000Z	Union.Akassa	855	2026-07-02 21:17:11.759679	\N	\N	\N
544	2026-05-29T00:00:00.000Z	Lyssnaangen	842	2026-07-02 21:17:17.585167	\N	\N	\N
545	2026-05-28T00:00:00.000Z	Comviq.Se	852	2026-07-02 21:17:55.792258	\N	\N	\N
546	2026-05-26T00:00:00.000Z	Maxi Ica Storm Gnist	861	2026-07-02 21:18:04.884831	\N	\N	\N
547	2026-05-25T00:00:00.000Z	I00000393422	870	2026-07-02 21:18:20.443622	\N	\N	\N
548	2026-05-25T00:00:00.000Z	Lön	871	2026-07-02 21:18:30.230442	\N	\N	\N
549	2026-05-24T00:00:00.000Z	Mcdbolanderna	873	2026-07-02 21:18:36.219864	\N	\N	\N
550	2026-05-24T00:00:00.000Z	Maxi Ica Storm Gnist	874	2026-07-02 21:18:43.117415	\N	\N	\N
551	2026-05-23T00:00:00.000Z	City Gross Bolandern	878	2026-07-02 21:18:49.587676	\N	\N	\N
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_id_seq', 50, true);


--
-- Name: bank_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_events_id_seq', 1052, true);


--
-- Name: booking_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.booking_templates_id_seq', 9, true);


--
-- Name: budgets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.budgets_id_seq', 1032, true);


--
-- Name: custom_result_view_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.custom_result_view_accounts_id_seq', 1, false);


--
-- Name: custom_result_view_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.custom_result_view_groups_id_seq', 1, false);


--
-- Name: custom_result_view_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.custom_result_view_types_id_seq', 1, false);


--
-- Name: custom_result_views_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.custom_result_views_id_seq', 1, false);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.groups_id_seq', 17, true);


--
-- Name: imports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.imports_id_seq', 19, true);


--
-- Name: period_locks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.period_locks_id_seq', 1, false);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 1249, true);


--
-- Name: recurring_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recurring_items_id_seq', 13, true);


--
-- Name: template_rows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.template_rows_id_seq', 18, true);


--
-- Name: transaction_recurring_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_recurring_items_id_seq', 126, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 551, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_events bank_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_events
    ADD CONSTRAINT bank_events_pkey PRIMARY KEY (id);


--
-- Name: booking_templates booking_templates_namn_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_templates
    ADD CONSTRAINT booking_templates_namn_key UNIQUE (namn);


--
-- Name: booking_templates booking_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_templates
    ADD CONSTRAINT booking_templates_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_account_id_year_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_account_id_year_month_key UNIQUE (account_id, year, month);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: custom_result_view_accounts custom_result_view_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_accounts
    ADD CONSTRAINT custom_result_view_accounts_pkey PRIMARY KEY (id);


--
-- Name: custom_result_view_accounts custom_result_view_accounts_view_id_account_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_accounts
    ADD CONSTRAINT custom_result_view_accounts_view_id_account_id_key UNIQUE (view_id, account_id);


--
-- Name: custom_result_view_groups custom_result_view_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_groups
    ADD CONSTRAINT custom_result_view_groups_pkey PRIMARY KEY (id);


--
-- Name: custom_result_view_groups custom_result_view_groups_view_id_group_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_groups
    ADD CONSTRAINT custom_result_view_groups_view_id_group_id_key UNIQUE (view_id, group_id);


--
-- Name: custom_result_view_types custom_result_view_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_types
    ADD CONSTRAINT custom_result_view_types_pkey PRIMARY KEY (id);


--
-- Name: custom_result_view_types custom_result_view_types_view_id_account_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_types
    ADD CONSTRAINT custom_result_view_types_view_id_account_type_key UNIQUE (view_id, account_type);


--
-- Name: custom_result_views custom_result_views_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_views
    ADD CONSTRAINT custom_result_views_pkey PRIMARY KEY (id);


--
-- Name: groups groups_namn_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_namn_key UNIQUE (namn);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: imports imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_pkey PRIMARY KEY (id);


--
-- Name: period_locks period_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_locks
    ADD CONSTRAINT period_locks_pkey PRIMARY KEY (id);


--
-- Name: period_locks period_locks_year_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_locks
    ADD CONSTRAINT period_locks_year_month_key UNIQUE (year, month);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: recurring_items recurring_items_namn_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_items
    ADD CONSTRAINT recurring_items_namn_key UNIQUE (namn);


--
-- Name: recurring_items recurring_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_items
    ADD CONSTRAINT recurring_items_pkey PRIMARY KEY (id);


--
-- Name: template_rows template_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_rows
    ADD CONSTRAINT template_rows_pkey PRIMARY KEY (id);


--
-- Name: transaction_recurring_items transaction_recurring_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_recurring_items
    ADD CONSTRAINT transaction_recurring_items_pkey PRIMARY KEY (id);


--
-- Name: transaction_recurring_items transaction_recurring_items_transaction_id_recurring_item_i_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_recurring_items
    ADD CONSTRAINT transaction_recurring_items_transaction_id_recurring_item_i_key UNIQUE (transaction_id, recurring_item_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: idx_budgets_account_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budgets_account_year ON public.budgets USING btree (account_id, year);


--
-- Name: idx_budgets_year_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budgets_year_month ON public.budgets USING btree (year, month);


--
-- Name: idx_custom_view_accounts_view_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_view_accounts_view_id ON public.custom_result_view_accounts USING btree (view_id);


--
-- Name: idx_custom_view_groups_view_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_view_groups_view_id ON public.custom_result_view_groups USING btree (view_id);


--
-- Name: idx_custom_view_types_view_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_view_types_view_id ON public.custom_result_view_types USING btree (view_id);


--
-- Name: idx_transactions_original_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_original_id ON public.transactions USING btree (original_transaction_id);


--
-- Name: accounts accounts_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: bank_events bank_events_import_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_events
    ADD CONSTRAINT bank_events_import_id_fkey FOREIGN KEY (import_id) REFERENCES public.imports(id) ON DELETE CASCADE;


--
-- Name: bank_events bank_events_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_events
    ADD CONSTRAINT bank_events_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: budgets budgets_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: custom_result_view_accounts custom_result_view_accounts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_accounts
    ADD CONSTRAINT custom_result_view_accounts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: custom_result_view_accounts custom_result_view_accounts_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_accounts
    ADD CONSTRAINT custom_result_view_accounts_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.custom_result_views(id) ON DELETE CASCADE;


--
-- Name: custom_result_view_groups custom_result_view_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_groups
    ADD CONSTRAINT custom_result_view_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: custom_result_view_groups custom_result_view_groups_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_groups
    ADD CONSTRAINT custom_result_view_groups_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.custom_result_views(id) ON DELETE CASCADE;


--
-- Name: custom_result_view_types custom_result_view_types_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_result_view_types
    ADD CONSTRAINT custom_result_view_types_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.custom_result_views(id) ON DELETE CASCADE;


--
-- Name: imports imports_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imports
    ADD CONSTRAINT imports_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: posts posts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: posts posts_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: template_rows template_rows_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_rows
    ADD CONSTRAINT template_rows_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: template_rows template_rows_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_rows
    ADD CONSTRAINT template_rows_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.booking_templates(id) ON DELETE CASCADE;


--
-- Name: transaction_recurring_items transaction_recurring_items_recurring_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_recurring_items
    ADD CONSTRAINT transaction_recurring_items_recurring_item_id_fkey FOREIGN KEY (recurring_item_id) REFERENCES public.recurring_items(id) ON DELETE CASCADE;


--
-- Name: transaction_recurring_items transaction_recurring_items_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_recurring_items
    ADD CONSTRAINT transaction_recurring_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_bank_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_bank_event_id_fkey FOREIGN KEY (bank_event_id) REFERENCES public.bank_events(id);


--
-- Name: transactions transactions_bridge_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_bridge_account_id_fkey FOREIGN KEY (bridge_account_id) REFERENCES public.accounts(id);


--
-- Name: transactions transactions_original_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_original_transaction_id_fkey FOREIGN KEY (original_transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict jmdZmJPn1eJ3prPcgKP0YAg5YuSoKJal7Lc78ujL0Kmg3GRDdmDFpp0VMec4LOf

