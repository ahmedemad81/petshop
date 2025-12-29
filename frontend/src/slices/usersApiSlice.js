import { USERS_URL } from "../constants";
import { apiSlice } from "./apiSlice";

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/auth`,
        method: "POST",
        body: data,
      }),
    }),
    verifyMfaUser: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/auth/mfa`,
        method: "POST",
        body: data,
      }),
    }),
    authGoogle: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/auth/google`,
        method: "POST",
        body: data,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/logout`,
        method: "POST",
      }),
    }),
    register: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/register`,
        method: "POST",
        body: data,
      }),
    }),
    getUsers: builder.query({
      query: () => ({
        url: `${USERS_URL}`,
      }),
      providesTags: ["Users"],
      keepUnusedDataFor: 5,
    }),
    profile: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/profile`,
        method: "PUT",
        body: data,
      }),
    }),
    userPassword: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/password`,
        method: "PUT",
        body: data,
      }),
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `${USERS_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    getUserDetails: builder.query({
      query: (userId) => ({
        url: `${USERS_URL}/${userId}`,
      }),
      keepUnusedDataFor: 5,
    }),
  }),
});

export const {
  useLoginMutation,
  useVerifyMfaUserMutation,
  useAuthGoogleMutation,
  useLogoutMutation,
  useRegisterMutation,
  useGetUsersQuery,
  useProfileMutation,
  useUserPasswordMutation,
  useDeleteUserMutation,
  useGetUserDetailsQuery,
} = usersApiSlice;
