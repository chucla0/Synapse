const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      scope: ['profile', 'email'],
      passReqToCallback: true,
      proxy: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const name = profile.displayName;
        // Get higher quality photo by removing size parameter
        const avatar = profile.photos[0]?.value?.replace('=s96-c', '');

        const isConnectAction = req.query.state === 'connect_calendar';

        // Check if user exists
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          // Update existing user
          const updateData = {
            googleId,
            avatar: user.avatar || avatar,
          };

          // Only update tokens if this is a connect action
          if (isConnectAction) {
            updateData.googleAccessToken = accessToken;
            if (refreshToken) updateData.googleRefreshToken = refreshToken;
          }

          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        } else {
          // Create new user
          const createData = {
            email,
            name,
            googleId,
            avatar,
            isVerified: true,
          };

          // Only save tokens if this is a connect action (unlikely for registration, but possible)
          if (isConnectAction) {
            createData.googleAccessToken = accessToken;
            createData.googleRefreshToken = refreshToken;
          }

          user = await prisma.user.create({
            data: createData
          });
          // Flag for controller to know this is a fresh registration
          user.isNewUser = true;
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
