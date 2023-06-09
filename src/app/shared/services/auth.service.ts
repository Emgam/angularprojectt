import { Injectable, NgZone } from '@angular/core';
import { User } from '../services/user';
import * as auth from 'firebase/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  userData: any; // Save logged in user data
  constructor(
    public afs: AngularFirestore, // Inject Firestore service
    public afAuth: AngularFireAuth, // Inject Firebase auth service
    public router: Router,
    public ngZone: NgZone // NgZone service to remove outside scope warning
  ) {
    /* Saving user data in localstorage when
    logged in and setting up null when logged out */
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        this.userData = user;
        localStorage.setItem('user', JSON.stringify(this.userData));
        JSON.parse(localStorage.getItem('user')!);
      } else {
        localStorage.setItem('user', 'null');
        JSON.parse(localStorage.getItem('user')!);
      }
    });
  }
// Sign in with email/password
SignIn(email: string, password: string) {
  return this.afAuth.signInWithEmailAndPassword(email, password)
    .then((result) => {
      if (result.user) {
        this.afs.collection('users').doc<User>(result.user.uid).get().toPromise().then((doc: firebase.firestore.DocumentSnapshot<User> | undefined) => {


          if (doc && doc.exists) {
            const data = doc.data() as User; // cast de la donnée récupérée en User
            this.SetUserData(data);
            this.afAuth.authState.subscribe((user) => {
              if (user) {
                const userRoles = data.roles;
                if (userRoles.admin) {
                  this.router.navigate(['admin']);
                } else {
                  this.router.navigate(['dashboard']);
                }
              }
            });
          } else {
            console.log("No such document!");
          }
        }).catch((error) => {
          console.log("Error getting document:", error);
        });
      } else {
        console.log("User not found in UserCredential");
      }
    })
    .catch((error) => {
      Swal.fire({
        icon: 'error',
        title: "Login Failed!",
        text: error.message,
        confirmButtonColor: '#FCC8D1',
      });
    });
}






  // Sign up with email/password
  SignUp(email: string, password: string) {
    return this.afAuth
      .createUserWithEmailAndPassword(email, password)
      .then((result) => {
        /* Call the SendVerificaitonMail() function when new user sign
        up and returns promise */
        this.SendVerificationMail();
        this.SetUserData(result.user);
        // Use SweetAlert to display success message
        Swal.fire({
          icon: 'success',
          title: 'Signup Successful',
          text: 'You have successfully signed up!',
          confirmButtonColor: '#FCC8D1'
        });
      })
      .catch((error) => {
        // Use SweetAlert to display error message
        Swal.fire({
          icon: 'error',
          title: 'Signup Failed',
          text: error.message,
          confirmButtonColor: '#FCC8D1'
        });
      });
  }
  // Send email verfificaiton when new user sign up
  SendVerificationMail() {
    return this.afAuth.currentUser
      .then((u: any) => u.sendEmailVerification())
      .then(() => {
        this.router.navigate(['verify-email-address']);
      });
  }
  // Reset Forggot password
  ForgotPassword(passwordResetEmail: string) {
    return this.afAuth
      .sendPasswordResetEmail(passwordResetEmail)
      .then(() => {
        // Use SweetAlert to display success message
        Swal.fire({
          icon: 'success',
          title: 'Password Reset Email Sent',
          text: 'Please check your inbox for further instructions.',
          confirmButtonColor: '#FCC8D1'
        });
      })
      .catch((error) => {
        // Use SweetAlert to display error message
        Swal.fire({
          icon: 'error',
          title: 'Password Reset Failed',
          text: error.message,
          confirmButtonColor: '#FCC8D1'
        });
      });
  }








  // Sign in with Google
  GoogleAuth() {
    return this.AuthLogin(new auth.GoogleAuthProvider()).then((res: any) => {
      this.router.navigate(['dashboard']);
    });
  }
  // Auth logic to run auth providers
  AuthLogin(provider: any) {
    return this.afAuth
      .signInWithPopup(provider)
      .then((result) => {
        this.router.navigate(['dashboard']);
        this.SetUserData(result.user);
      })
      .catch((error) => {
        window.alert(error);
      });
  }
  /* Setting up user data when sign in with username/password,
  sign up with username/password and sign in with social auth
  provider in Firestore database using AngularFirestore + AngularFirestoreDocument service */
  SetUserData(user: any) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    const userData: User = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      roles: {
        admin: false
      },
      accountType:user.accountType  };

    return userRef.set(userData, {
      merge: true,
    });
  }
  // Sign out
  SignOut() {
    return this.afAuth.signOut().then(() => {
      localStorage.removeItem('user');
      this.router.navigate(['sign-in']);
    });
  }
   // Returns true when user is looged in and email is verified
   get isLoggedIn(): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    return user !== null && user.emailVerified !== false ? true : false;
  }
}
