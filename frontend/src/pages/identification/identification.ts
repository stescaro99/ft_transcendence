import autentificationHtml from './identification.html?raw';
import { User } from '../../model/user.model';
import { UserService } from '../../service/user.service';
import { AuthenticationService } from '../../service/authentication.service';
import '../../style.css';
import './identification.css'

export class IdentificationPage {
	user: User = new User();
	userService: UserService = new UserService();
	authenticationService: AuthenticationService = new AuthenticationService();
	qrCode: string = '';

	constructor() {
    this.render();
    this.addEventListeners();
  }

  private render() {
    const appDiv = document.getElementById('app');
    if (appDiv) {
        appDiv.innerHTML = autentificationHtml;
    }
  }

private handleSubmit(event: Event) {
	console.log('button');
	event.preventDefault();
	this.userService.postUserToApi(this.user)
	.then((response) => {
    	console.log('User saved successfully:', response);
		this.authenticationService.takeQrCodeFromApi(this.user.nickname, this.user.password) 
		.then((qrResponse) => {
			this.qrCode = qrResponse.qrCode;
			const qrLabel = document.querySelector('label[for="qrCode"]');
			if (qrLabel) { 
			  qrLabel.innerHTML = `  <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
			<img src="${this.qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
			<div id="token2FA" style="display: flex; gap: 8px; justify-content: center;">
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				-
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
			</div>
				<button id="verify2FA" class="button">Verify</button>
			</div>`;
			}
			const inputs = document.querySelectorAll('#token2FA input');
			inputs.forEach((input, idx) => {
				input.addEventListener('input', () => {
					if ((input as HTMLInputElement).value.length === 1 && idx < inputs.length - 1) {
						(inputs[idx + 1] as HTMLInputElement).focus();
					}	
				});
			});
			const verifyBtn = document.getElementById('verify2FA');
			if (verifyBtn) {
				verifyBtn.addEventListener('click', () => {
					const inputs = document.querySelectorAll('#token2FA input');
					let code = '';
					inputs.forEach(input => {
					code += (input as HTMLInputElement).value;
					});
					this.authenticationService.verifyQrCodeFromApi(this.user.nickname, code)
					.then((verifyResponse) => {
						console.log('2FA verified successfully:', verifyResponse);
						localStorage.setItem('user', JSON.stringify(verifyResponse.user));
						window.location.hash = '/home';
				})
					.catch((verifyError) => {
						console.error('Error verifying 2FA:', verifyError);
						alert('Verification failed. Please try again.');
					});
				});
			}
		})
		.catch((error) => {
			console.error('Error fetching QR code:', error);
			this.userService.deleteUserFromApi(this.user.nickname)
			.then(() => {
				console.log('User deleted successfully due to QR code error');
			})
			.catch((deleteError) => {
				console.error('Error deleting user:', deleteError);
			});
		});

    })
    .catch((error) => {
      console.error('Error saving user:', error);
    });

  }

  private addEventListeners() {
    const form = document.querySelector('#loginForm');
    if (form) {
      form.addEventListener('submit', this.handleSubmit.bind(this));
    }
	const nameInput = document.getElementById('nameInput') as HTMLInputElement;
	if (nameInput) {
	nameInput.addEventListener('blur', () => {
			this.user.name = nameInput.value;
			console.log('name', this.user.name);
		});
	}
	const surnameInput = document.getElementById('surnameInput') as HTMLInputElement;
	if (surnameInput) {
	surnameInput.addEventListener('blur', () => {
			this.user.surname = surnameInput.value;
			console.log('surname', this.user.surname);
		});
	}
	const nicknameInput = document.getElementById('nicknameInput') as HTMLInputElement;
	if (nicknameInput) {
		nicknameInput.addEventListener('blur', () => {
				this.authenticationService.aviabilityCheck('nickname', nicknameInput.value)
				.then((response) => {
					if (response.available) {
						const nickSpan = document.getElementById('nicknameSpan');
						if (nickSpan) 
							nickSpan.textContent = ''
						this.user.nickname = nicknameInput.value;
					}
					else {
						alert('Nickname is already taken. Please choose another one.');
						nicknameInput.value = '';
						const nickSpan = document.getElementById('nicknameSpan');
						if (nickSpan) {
							nickSpan.textContent = 'Nickname is already taken. Please choose another one.';
						}
					}
			});
		});
	}
	const emailInput = document.getElementById('emailInput') as HTMLInputElement;
	if (emailInput) {
	emailInput.addEventListener('blur', () => {
			this.user.email = emailInput.value;
			this.authenticationService.aviabilityCheck('email', emailInput.value)
			.then((response) => {
				if (response.available) {
					const emailSpan = document.getElementById('emailSpan');
					if (emailSpan) {
						emailSpan.textContent = '';
					}
					this.user.email = emailInput.value;
				}
				else {
					alert('Email is already taken. Please choose another one.');
					emailInput.value = '';
					const emailSpan = document.getElementById('emailSpan');
					if (emailSpan) {
						emailSpan.textContent = 'Email is already taken. Please choose another one.';
					}
				}
			})
		});
	}
	const passwordInput = document.getElementById('passwordInput') as HTMLInputElement;
	if (passwordInput) {
	passwordInput.addEventListener('blur', () => {
			this.user.password = passwordInput.value;
			console.log('surname', this.user.surname);
		});
	}
	 const imageInput = document.getElementById('imageInput') as HTMLInputElement;
  if (imageInput) {
		imageInput.addEventListener('change', () => {
			const file = imageInput.files?.[0];
			if (file) {
					const reader = new FileReader();
					reader.onload =  (e) =>{
					const base64String = (e.target?.result as string) || '';
					this.userService.UpdateImageUrl(base64String)
					.then((response) => {
						console.log('Image URL updated successfully:', response);
						this.user.image_url = response.imageUrl;
					})
					.catch((error) => {
						console.error('Error updating image URL:', error);
						alert('Failed to update image URL. Please try again.');
					});
				}
				reader.readAsDataURL(file);
			}
		});
	}
  }
}